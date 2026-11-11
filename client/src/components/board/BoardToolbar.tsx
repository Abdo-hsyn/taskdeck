import type { Priority, Status } from '../../api/client';

type ToolbarProps = {
  query: string;
  onQuery: (value: string) => void;
  priority: Priority | 'all';
  onPriority: (value: Priority | 'all') => void;
  status: Status | 'all';
  onStatus: (value: Status | 'all') => void;
  onReset: () => void;
  shown: number;
  total: number;
};

const PRIORITY_CHIPS: Array<{ value: Priority | 'all'; label: string; tone?: 'low' | 'medium' | 'high' }> = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low', tone: 'low' },
  { value: 'medium', label: 'Med', tone: 'medium' },
  { value: 'high', label: 'High', tone: 'high' },
];

const STATUS_CHIPS: Array<{ value: Status | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

export function BoardToolbar({
  query,
  onQuery,
  priority,
  onPriority,
  status,
  onStatus,
  onReset,
  shown,
  total,
}: ToolbarProps) {
  const hasFilters = query !== '' || priority !== 'all' || status !== 'all';

  return (
    <div className="board-toolbar">
      <div className="search">
        <span className="search-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" focusable="false">
            <circle cx="6" cy="6" r="4.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          className="input"
          type="text"
          placeholder="Search tasks…"
          aria-label="Search tasks by title or description"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="filter-group" role="group" aria-label="Filter by priority">
        <span className="eyebrow">Priority</span>
        {PRIORITY_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className="chip"
            data-tone={chip.tone}
            aria-pressed={priority === chip.value}
            onClick={() => onPriority(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="filter-group" role="group" aria-label="Filter by status column">
        <span className="eyebrow">Status</span>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className="chip"
            aria-pressed={status === chip.value}
            onClick={() => onStatus(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button type="button" className="chip" onClick={onReset}>
          Reset
        </button>
      )}

      <span className="mono showing muted" aria-live="polite">
        {shown} / {total} tasks
      </span>
    </div>
  );
}

type StatsProps = { total: number; todo: number; doing: number; done: number };

export function StatsStrip({ total, todo, doing, done }: StatsProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="stats-strip" aria-label="Project stats">
      <div className="stat">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat-sep" aria-hidden="true" />
      <div className="stat">
        <span className="stat-value">{todo}</span>
        <span className="stat-label">Todo</span>
      </div>
      <div className="stat-sep" aria-hidden="true" />
      <div className="stat">
        <span className="stat-value is-doing">{doing}</span>
        <span className="stat-label">Doing</span>
      </div>
      <div className="stat-sep" aria-hidden="true" />
      <div className="stat">
        <span className="stat-value is-done">{done}</span>
        <span className="stat-label">Done</span>
      </div>
      <div className="progress-wrap">
        <div
          className="progress"
          role="progressbar"
          aria-label="Completion"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-pct">{pct}%</span>
      </div>
    </section>
  );
}
