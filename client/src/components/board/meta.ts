import type { Status } from '../../api/client';

export const STATUSES: Status[] = ['todo', 'doing', 'done'];

export const COLUMNS: Array<{ status: Status; label: string }> = [
  { status: 'todo', label: 'Todo' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
];

export const PRIORITY_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

/** Status lamp classes — the board's signature indicator (see design/direction.md). */
export function statusLamp(status: Status, flash = false): string {
  if (status === 'doing') return 'lamp lamp-doing';
  if (status === 'done') return `lamp lamp-done${flash ? ' lamp-flash' : ''}`;
  return 'lamp';
}

/** True when the due date is in the past and the task is not done yet. */
export function isOverdue(dueDate: string | null | undefined, status: Status): boolean {
  if (!dueDate || status === 'done') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
