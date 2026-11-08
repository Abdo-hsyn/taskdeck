import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  comments as commentsApi,
  projects as projectsApi,
  tasks as tasksApi,
  ApiError,
  type Priority,
  type Project,
  type Status,
  type Task,
  type TaskDetail,
} from '../api/client';
import { useAuth } from '../context/auth-context';

const COLUMNS: Array<{ status: Status; label: string }> = [
  { status: 'todo', label: 'Todo' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
];

const PRIORITY_LABEL: Record<Priority, string> = { low: 'LOW', medium: 'MED', high: 'HIGH' };

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Status | null>(null); // lamp flash on drop

  const [showNewTask, setShowNewTask] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [newError, setNewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

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

  function openTask(taskId: string) {
    setDetail(null);
    setDetailError(null);
    setOpenTaskId(taskId);
  }

  function closeTask() {
    setOpenTaskId(null);
    setDetail(null);
    setDetailError(null);
  }

  // Load task detail whenever a card is opened
  useEffect(() => {
    if (!openTaskId) return;
    let cancelled = false;
    tasksApi
      .get(openTaskId)
      .then(({ task }) => {
        if (!cancelled) {
          setDetail(task);
          setDetailError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err instanceof ApiError ? err.message : 'Failed to load the task.');
      });
    return () => {
      cancelled = true;
    };
  }, [openTaskId]);

  async function onCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setNewError(null);
    setSubmitting(true);
    try {
      await tasksApi.create(id, { title, priority });
      setTitle('');
      setPriority('medium');
      setShowNewTask(false);
      load();
    } catch (err) {
      setNewError(err instanceof ApiError ? err.message : 'Could not create the task.');
    } finally {
      setSubmitting(false);
    }
  }

  async function moveTask(task: Task, status: Status) {
    if (task.status === status) return;
    // Optimistic: update local state first, roll back on failure
    setProject((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) } : prev,
    );
    try {
      await tasksApi.update(task.id, { status });
      if (status === 'done') {
        setFlash('done');
        window.setTimeout(() => setFlash(null), 600);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move the task.');
      load();
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await tasksApi.remove(taskId);
      closeTask();
      load();
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Could not delete the task.');
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!openTaskId || !commentBody.trim()) return;
    setCommentBusy(true);
    try {
      await commentsApi.create(openTaskId, commentBody.trim());
      setCommentBody('');
      const { task } = await tasksApi.get(openTaskId);
      setDetail(task);
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Could not add the comment.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!openTaskId) return;
    try {
      await commentsApi.remove(commentId);
      const { task } = await tasksApi.get(openTaskId);
      setDetail(task);
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Could not delete the comment.');
    }
  }

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
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

        {showNewTask && (
          <form className="panel" onSubmit={onCreateTask} style={{ marginBottom: 20 }}>
            <label className="field">
              <span>Task title</span>
              <input className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              <span>Priority</span>
              <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            {newError && <p className="error-text">{newError}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </button>
          </form>
        )}

        {!project && !error && (
          <div className="state">
            <div className="spinner" />
          </div>
        )}

        {project && (
          <div className="board">
            {COLUMNS.map((col) => {
              const tasks = project.tasks.filter((t) => t.status === col.status);
              const lampClass =
                col.status === 'doing'
                  ? 'lamp lamp-doing'
                  : col.status === 'done'
                    ? `lamp lamp-done${flash === 'done' ? ' lamp-flash' : ''}`
                    : 'lamp';
              return (
                <section
                  key={col.status}
                  className="column"
                  aria-label={`${col.label} column, ${tasks.length} tasks`}
                >
                  <header className="column-head">
                    <span className={lampClass} aria-hidden="true" />
                    <span className="column-title">{col.label}</span>
                    <span className="mono column-count">{tasks.length}</span>
                  </header>

                  <div className="column-body">
                    {tasks.length === 0 && <p className="muted" style={{ fontSize: 13, padding: 4 }}>Empty</p>}
                    {tasks.map((task) => (
                      <article key={task.id} className="task-card">
                        <button className="task-card-open" onClick={() => openTask(task.id)} type="button">
                          <span className={`badge badge-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
                          <span className="task-title">{task.title}</span>
                        </button>
                        <div className="task-actions">
                          {COLUMNS.filter((c) => c.status !== task.status).map((c) => (
                            <button
                              key={c.status}
                              className="btn btn-ghost task-move"
                              type="button"
                              title={`Move to ${c.label}`}
                              onClick={() => moveTask(task, c.status)}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
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

      {/* Task detail drawer */}
      {openTaskId && (
        <div className="drawer-backdrop" onClick={closeTask} role="presentation">
          <aside
            className="drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Task detail"
          >
            <header className="drawer-head">
              <p className="eyebrow">TASK / DETAIL</p>
              <button className="btn btn-ghost" type="button" onClick={closeTask}>
                ✕ Close
              </button>
            </header>

            {detailError && <p className="error-text">{detailError}</p>}

            {!detail && !detailError && (
              <div className="state">
                <div className="spinner" />
              </div>
            )}

            {detail && (
              <div className="drawer-body">
                <h2>{detail.title}</h2>

                <div className="task-meta">
                  <span className={`badge badge-${detail.priority}`}>{PRIORITY_LABEL[detail.priority]}</span>
                  <span className="badge">{detail.status}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>
                    updated {new Date(detail.updatedAt).toLocaleString()}
                  </span>
                </div>

                {detail.description && <p style={{ marginTop: 16 }}>{detail.description}</p>}

                <div className="task-meta" style={{ marginTop: 16 }}>
                  <span className="eyebrow">MOVE TO</span>
                  {COLUMNS.filter((c) => c.status !== detail.status).map((c) => (
                    <button
                      key={c.status}
                      className="btn"
                      type="button"
                      onClick={async () => {
                        await moveTask(detail, c.status);
                        const { task } = await tasksApi.get(detail.id);
                        setDetail(task);
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                  {(isOwner || detail.createdById === user?.id) && (
                    <button className="btn btn-danger" type="button" onClick={() => deleteTask(detail.id)}>
                      Delete task
                    </button>
                  )}
                </div>

                <hr className="rule" />

                <p className="eyebrow" style={{ marginBottom: 12 }}>
                  COMMENTS ({detail.comments.length})
                </p>

                <ul className="comment-list">
                  {detail.comments.map((c) => (
                    <li key={c.id}>
                      <div className="comment-head">
                        <strong>{c.authorName}</strong>
                        <span className="mono muted" style={{ fontSize: 11 }}>
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                        {(c.authorId === user?.id || isOwner) && (
                          <button className="btn btn-ghost comment-del" type="button" onClick={() => deleteComment(c.id)}>
                            ✕
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0 }}>{c.body}</p>
                    </li>
                  ))}
                  {detail.comments.length === 0 && <li className="muted">No comments yet.</li>}
                </ul>

                <form onSubmit={addComment} style={{ marginTop: 14 }}>
                  <label className="field">
                    <span>Add a comment</span>
                    <textarea
                      className="textarea"
                      maxLength={2000}
                      required
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                    />
                  </label>
                  <button className="btn btn-primary" type="submit" disabled={commentBusy}>
                    {commentBusy ? 'Posting…' : 'Post comment'}
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
