import { useCallback, useRef, useState, type ReactNode } from 'react';

type Tone = 'ok' | 'err' | 'info';

type Toast = { id: number; text: string; tone: Tone };

/**
 * Minimal toast host: each page keeps its own stack.
 * Returns a `push` function and the rendered stack (mount it once per page).
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (text: string, tone: Tone = 'ok') => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, text, tone }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const stack: ReactNode = (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast${t.tone === 'err' ? ' toast-err' : t.tone === 'info' ? ' toast-info' : ''}`}
        >
          <span>{t.text}</span>
          <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  return { push, stack };
}
