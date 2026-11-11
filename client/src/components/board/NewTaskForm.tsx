import { useState, type FormEvent } from 'react';
import { tasks as tasksApi, ApiError, type Priority } from '../../api/client';

type Props = {
  projectId: string;
  onCreated: () => void;
  onClose: () => void;
};

export function NewTaskForm({ projectId, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await tasksApi.create(projectId, { title, priority });
      setTitle('');
      setPriority('medium');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel panel-in" onSubmit={onSubmit} style={{ marginBottom: 20 }}>
      <p className="eyebrow" style={{ marginBottom: 12 }}>
        NEW TASK
      </p>
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
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add task'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
