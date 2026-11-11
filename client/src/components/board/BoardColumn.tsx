import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Status, Task } from '../../api/client';
import { TaskCard } from './TaskCard';
import { statusLamp } from './meta';

type Props = {
  status: Status;
  label: string;
  tasks: Task[];
  flash: boolean;
  isDropTarget: boolean;
  dragging: boolean;
  emptyNote: string;
  onOpen: (task: Task) => void;
};

export function BoardColumn({ status, label, tasks, flash, isDropTarget, dragging, emptyNote, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });

  return (
    <section
      className={`column${isDropTarget || isOver ? ' is-drop-target' : ''}`}
      aria-label={`${label} column, ${tasks.length} tasks`}
    >
      <header className="column-head">
        <span className={statusLamp(status, flash)} aria-hidden="true" />
        <span className="column-title">{label}</span>
        <span className="mono column-count">{tasks.length}</span>
      </header>

      <div className="column-body" ref={setNodeRef}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="column-empty">{dragging ? 'Drop here' : emptyNote}</p>}
      </div>
    </section>
  );
}
