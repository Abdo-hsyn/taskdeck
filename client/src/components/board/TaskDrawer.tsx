import { useEffect, useState, type FormEvent } from 'react';
import { comments as commentsApi, tasks as tasksApi, ApiError, type Status, type Task, type TaskDetail } from '../../api/client';
import { COLUMNS, PRIORITY_LABEL, isOverdue, statusLamp } from './meta';

type Props = {
  taskId: string;
  isOwner: boolean;
  currentUserId: string | undefined;
  onMove: (task: Task, status: Status) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onClose: () => void;
};

export function TaskDrawer({ taskId, isOwner, currentUserId, onMove, onDelete, onClose }: Props) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);

  // Load task detail (BoardPage keys this drawer by taskId, so each open
  // starts fresh with detail=null — no reset needed here)
  useEffect(() => {
    let cancelled = false;
    tasksApi
      .get(taskId)
      .then(({ task }) => {
        if (!cancelled) setDetail(task);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load the task.');
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // Escape closes the drawer
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function moveTo(status: Status) {
    if (!detail) return;
    setMoveBusy(true);
    try {
      await onMove(detail, status);
      const { task } = await tasksApi.get(taskId);
      setDetail(task);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move the task.');
    } finally {
      setMoveBusy(false);
    }
  }

  async function onDeleteTask() {
    if (!detail) return;
    try {
      await onDelete(detail.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the task.');
    }
  }

  async function onAddComment(event: FormEvent) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    setCommentBusy(true);
    try {
      await commentsApi.create(taskId, commentBody.trim());
      setCommentBody('');
      const { task } = await tasksApi.get(taskId);
      setDetail(task);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the comment.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    try {
      await commentsApi.remove(commentId);
      const { task } = await tasksApi.get(taskId);
      setDetail(task);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the comment.');
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Task detail">
        <header className="drawer-head">
          <p className="eyebrow">TASK / DETAIL</p>
          <button className="btn btn-ghost" type="button" onClick={onClose} autoFocus>
            ✕ Close
          </button>
        </header>

        {error && <p className="error-text">{error}</p>}

        {!detail && !error && (
          <div className="state">
            <div className="spinner" />
          </div>
        )}

        {detail && (
          <div className="drawer-body">
            <h2>{detail.title}</h2>

            <div className="task-meta">
              <span className={`badge badge-${detail.priority}`}>{PRIORITY_LABEL[detail.priority]}</span>
              <span className="badge" aria-label="Status">
                <span className={statusLamp(detail.status)} aria-hidden="true" />
                {detail.status}
              </span>
              {detail.dueDate && (
                <span className={`due-chip${isOverdue(detail.dueDate, detail.status) ? ' is-overdue' : ''}`}>
                  Due {new Date(detail.dueDate).toLocaleDateString()}
                </span>
              )}
              <span className="mono muted" style={{ fontSize: 12 }}>
                updated {new Date(detail.updatedAt).toLocaleString()}
              </span>
            </div>

            {detail.description && <p style={{ marginTop: 16 }}>{detail.description}</p>}

            <div className="task-meta" style={{ marginTop: 16 }}>
              <span className="eyebrow">MOVE TO</span>
              {COLUMNS.filter((c) => c.status !== detail.status).map((c) => (
                <button key={c.status} className="btn" type="button" disabled={moveBusy} onClick={() => moveTo(c.status)}>
                  {c.label}
                </button>
              ))}
              {(isOwner || detail.createdById === currentUserId) && (
                <button className="btn btn-danger" type="button" disabled={moveBusy} onClick={onDeleteTask}>
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
                    {(c.authorId === currentUserId || isOwner) && (
                      <button className="btn btn-ghost comment-del" type="button" onClick={() => onDeleteComment(c.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0 }}>{c.body}</p>
                </li>
              ))}
              {detail.comments.length === 0 && <li className="muted">No comments yet.</li>}
            </ul>

            <form onSubmit={onAddComment} style={{ marginTop: 14 }}>
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
  );
}
