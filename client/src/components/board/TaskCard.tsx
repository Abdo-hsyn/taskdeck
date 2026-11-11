import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Task } from '../../api/client';
import { PRIORITY_LABEL, isOverdue } from './meta';

const GRIP_DOTS = [2, 6].flatMap((x) => [3, 7, 11].map((y) => ({ x, y })));

function CardBody({ task, onOpen }: { task: Task; onOpen?: (task: Task) => void }) {
  const overdue = isOverdue(task.dueDate, task.status);
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <button
      className="task-card-open"
      type="button"
      onClick={onOpen ? () => onOpen(task) : undefined}
      disabled={!onOpen}
      tabIndex={onOpen ? 0 : -1}
    >
      <span className={`badge badge-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
      <span className="task-title">{task.title}</span>
      {due && <span className={`due-chip${overdue ? ' is-overdue' : ''}`}>{overdue ? 'Overdue' : `Due ${due}`}</span>}
    </button>
  );
}

/** Sortable card: grip starts a drag, the card body opens the detail drawer. */
export function TaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task, status: task.status },
  });

  const style: CSSProperties = { transform: CSS.Transform.toString(transform) };
  if (transition) {
    // keep the dnd transition and the card's own hover transitions
    style.transition = `${transition}, border-color 140ms ease-out, background 140ms ease-out`;
  }

  return (
    <article ref={setNodeRef} className={`task-card${isDragging ? ' is-dragging' : ''}`} style={style}>
      <CardBody task={task} onOpen={onOpen} />
      <button type="button" className="task-grip" aria-label={`Drag ${task.title}`} {...attributes} {...listeners}>
        <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true" focusable="false">
          {GRIP_DOTS.map(({ x, y }) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" />
          ))}
        </svg>
      </button>
    </article>
  );
}

/** Presentational card used by the drag overlay (follows the cursor). */
export function TaskCardFace({ task }: { task: Task }) {
  return (
    <article className="task-card drag-overlay-card">
      <CardBody task={task} />
    </article>
  );
}
