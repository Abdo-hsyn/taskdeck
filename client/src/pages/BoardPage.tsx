import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  projects as projectsApi,
  tasks as tasksApi,
  ApiError,
  type Priority,
  type Project,
  type Status,
  type Task,
} from '../api/client';
import { useAuth } from '../context/auth-context';
import { useToast } from '../components/Toast';
import { COLUMNS, STATUSES } from '../components/board/meta';
import { BoardColumn } from '../components/board/BoardColumn';
import { BoardToolbar, StatsStrip } from '../components/board/BoardToolbar';
import { NewTaskForm } from '../components/board/NewTaskForm';
import { TaskCardFace } from '../components/board/TaskCard';
import { TaskDrawer } from '../components/board/TaskDrawer';

/** Rebuild the board with one task moved to `status` at index `insertAt`. Pure. */
function applyMove(base: Task[], movedId: string, status: Status, insertAt: number): Task[] {
  const cols: Record<Status, Task[]> = { todo: [], doing: [], done: [] };
  for (const t of base) cols[t.status].push(t);

  let moved: Task | null = null;
  for (const s of STATUSES) {
    const index = cols[s].findIndex((t) => t.id === movedId);
    if (index !== -1) {
      moved = cols[s][index];
      cols[s] = cols[s].filter((_, i) => i !== index);
      break;
    }
  }
  if (!moved) return base;

  const target = cols[status];
  const at = Math.max(0, Math.min(insertAt, target.length));
  cols[status] = [...target.slice(0, at), { ...moved, status }, ...target.slice(at)];

  const out: Task[] = [];
  for (const s of STATUSES) cols[s].forEach((t, i) => out.push({ ...t, status: s, position: i }));
  return out;
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Status | null>(null); // lamp flash on drop into Done

  const [showNewTask, setShowNewTask] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null); // drag overlay
  const [overColumn, setOverColumn] = useState<Status | null>(null); // drop-target highlight

  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');

  const { push: toast, stack: toastStack } = useToast();
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());
  const suppressClickAt = useRef(0);

  const load = useCallback(() => {
    if (!id) return;
    projectsApi
      .get(id)
      .then(({ project }) => setProject(project))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Failed to load the project.');
      });
  }, [id, navigate]);

  useEffect(load, [load]);

  /** Serialize writes so rapid drops can't arrive out of order. */
  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const run = writeQueue.current.then(job, job);
    writeQueue.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  // ---------- derived ----------

  const tasks = project?.tasks ?? [];
  const q = query.trim().toLowerCase();
  const visibleTasks = tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });
  const filtering = q !== '' || priorityFilter !== 'all' || statusFilter !== 'all';
  const visibleColumns = statusFilter === 'all' ? COLUMNS : COLUMNS.filter((c) => c.status === statusFilter);
  const stats = { total: tasks.length, todo: 0, doing: 0, done: 0 };
  for (const t of tasks) stats[t.status] += 1;

  // ---------- actions ----------

  const moveTask = useCallback(
    (task: Task, status: Status, position?: number): Promise<void> => {
      if (!project) return Promise.resolve();
      const withoutMoved = project.tasks.filter((t) => t.status === status && t.id !== task.id);
      const insertAt = Math.max(0, Math.min(position ?? withoutMoved.length, withoutMoved.length));
      if (task.status === status && insertAt === task.position) return Promise.resolve();

      // Optimistic: apply locally first, reconcile with the server response
      setProject((cur) => (cur ? { ...cur, tasks: applyMove(cur.tasks, task.id, status, insertAt) } : cur));
      if (status === 'done') {
        setFlash('done');
        window.setTimeout(() => setFlash(null), 700);
      }

      return enqueue(() => tasksApi.update(task.id, { status, position: insertAt }))
        .then(({ task: updated }) => {
          setProject((cur) => (cur ? { ...cur, tasks: cur.tasks.map((t) => (t.id === updated.id ? updated : t)) } : cur));
        })
        .catch((err) => {
          load(); // authoritative rollback
          throw err;
        });
    },
    [project, enqueue, load],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await tasksApi.remove(taskId);
      setOpenTaskId(null);
      load();
      toast('Task deleted');
    },
    [load, toast],
  );

  function resetFilters() {
    setQuery('');
    setPriorityFilter('all');
    setStatusFilter('all');
  }

  function openTask(taskId: string) {
    if (Date.now() - suppressClickAt.current < 300) return; // ignore click after a drag
    setOpenTaskId(taskId);
  }

  const closeTask = useCallback(() => setOpenTaskId(null), []);

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // ---------- drag & drop ----------

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  }

  function onDragMove(event: DragMoveEvent) {
    const over = event.over;
    if (!over) {
      setOverColumn(null);
      return;
    }
    const status =
      (over.data.current?.status as Status | undefined) ?? (over.data.current?.task as Task | undefined)?.status ?? null;
    setOverColumn(status);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);
    suppressClickAt.current = Date.now();
    if (!over || !project || active.id === over.id) return;

    const moved = active.data.current?.task as Task | undefined;
    if (!moved) return;
    const overTask = over.data.current?.task as Task | undefined;
    const status = (over.data.current?.status as Status | undefined) ?? overTask?.status;
    if (!status) return;

    // Index of the task we are dropping onto, in the target column as displayed
    const column = project.tasks.filter((t) => t.status === status);
    const insertAt = overTask ? column.findIndex((t) => t.id === overTask.id) : column.length;
    if (insertAt === -1) return;

    moveTask(moved, status, insertAt).catch(() => {
      toast('Could not move the task — board re-synced.', 'err');
    });
  }

  function onDragCancel() {
    setActiveTask(null);
    setOverColumn(null);
    suppressClickAt.current = Date.now();
  }

  const isOwner = project?.role === 'owner';

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="lamp lamp-done" aria-hidden="true" />
          <span className="mono">TASKDECK</span>
        </div>

        <nav className="rail-nav" aria-label="Navigation">
          <Link to="/" className="rail-link">
            <span className="rail-link-name">← All projects</span>
          </Link>
        </nav>

        <div className="rail-user">
          <div>
            <div style={{ fontWeight: 500 }}>{user?.name}</div>
            <div className="mono muted" style={{ fontSize: 11 }}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="main-head">
          <div>
            <p className="eyebrow">BOARD / {project?.name ?? '…'}</p>
            <h1>{project?.name ?? 'Loading…'}</h1>
            {project?.description && <p className="muted" style={{ marginTop: 6 }}>{project.description}</p>}
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewTask((v) => !v)} type="button">
            {showNewTask ? 'Cancel' : '+ New task'}
          </button>
        </header>

        {error && <p className="error-text">{error}</p>}

        {project && (
          <>
            <StatsStrip total={stats.total} todo={stats.todo} doing={stats.doing} done={stats.done} />
            <BoardToolbar
              query={query}
              onQuery={setQuery}
              priority={priorityFilter}
              onPriority={setPriorityFilter}
              status={statusFilter}
              onStatus={setStatusFilter}
              onReset={resetFilters}
              shown={visibleTasks.length}
              total={tasks.length}
            />
          </>
        )}

        {showNewTask && id && (
          <NewTaskForm
            projectId={id}
            onCreated={() => {
              load();
              toast('Task created');
            }}
            onClose={() => setShowNewTask(false)}
          />
        )}

        {!project && !error && (
          <div className="board" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton skeleton-col" />
            ))}
          </div>
        )}

        {project && filtering && visibleTasks.length === 0 && (
          <div className="empty-note">
            No tasks match your filters.{' '}
            <button type="button" className="chip" onClick={resetFilters}>
              Reset
            </button>
          </div>
        )}

        {project && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <div
              className="board"
              style={{ '--board-cols': visibleColumns.length } as CSSProperties}
            >
              {visibleColumns.map((col) => (
                <BoardColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  tasks={visibleTasks.filter((t) => t.status === col.status)}
                  flash={flash === 'done'}
                  isDropTarget={overColumn === col.status}
                  dragging={activeTask !== null}
                  emptyNote={tasks.length === 0 ? 'No tasks yet' : filtering ? 'No matches' : 'Empty'}
                  onOpen={(task) => openTask(task.id)}
                />
              ))}
            </div>
            <DragOverlay>{activeTask ? <TaskCardFace task={activeTask} /> : null}</DragOverlay>
          </DndContext>
        )}

        {project && (
          <section className="panel" style={{ marginTop: 24 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>MEMBERS ({project.members.length})</p>
            <ul className="member-list">
              {project.members.map((m) => (
                <li key={m.userId}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{m.email}</span>
                  <span className={`badge${m.role === 'owner' ? ' badge-medium' : ''}`}>{m.role}</span>
                </li>
              ))}
            </ul>
            {isOwner && (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                You are the owner — invite teammates from the API: <code className="mono">POST /projects/:id/members</code>
              </p>
            )}
          </section>
        )}
      </main>

      {openTaskId && project && (
        <TaskDrawer
          key={openTaskId}
          taskId={openTaskId}
          isOwner={isOwner}
          currentUserId={user?.id}
          onMove={moveTask}
          onDelete={deleteTask}
          onClose={closeTask}
        />
      )}

      {toastStack}
    </div>
  );
}
