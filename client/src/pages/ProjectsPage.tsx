import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projects as api, ApiError, type ProjectListItem } from '../api/client';
import { useAuth } from '../context/auth-context';

export default function ProjectsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .list()
      .then(({ projects }) => setList(projects))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load projects.'));
  }, []);

  useEffect(load, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const { project } = await api.create({ name, description: description || undefined });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create the project.');
      setSubmitting(false);
    }
  }

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="lamp lamp-done" aria-hidden="true" />
          <span className="mono">TASKDECK</span>
        </div>

        <nav className="rail-nav" aria-label="Projects">
          <p className="eyebrow" style={{ padding: '0 12px 8px' }}>
            Projects
          </p>
          {list?.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="rail-link">
              <span className="rail-link-name">{p.name}</span>
              <span className="mono rail-link-count">{p.taskCount}</span>
            </Link>
          ))}
          {list && list.length === 0 && <p className="muted" style={{ padding: '0 12px', fontSize: 13 }}>No projects yet.</p>}
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
            <p className="eyebrow">WORKSPACE / ALL PROJECTS</p>
            <h1>Projects</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)} type="button">
            {showCreate ? 'Cancel' : '+ New project'}
          </button>
        </header>

        {showCreate && (
          <form className="panel" onSubmit={onCreate} style={{ marginBottom: 24 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>NEW PROJECT</p>
            <label className="field">
              <span>Name</span>
              <input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Description (optional)</span>
              <textarea className="textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {formError && <p className="error-text">{formError}</p>}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </form>
        )}

        {error && <p className="error-text">{error}</p>}

        {!list && !error && (
          <div className="state">
            <div className="spinner" />
          </div>
        )}

        {list && list.length === 0 && !showCreate && (
          <div className="state panel">
            <h3>No projects yet</h3>
            <p className="muted">Create your first project to start moving tasks.</p>
          </div>
        )}

        {list && list.length > 0 && (
          <div className="project-grid">
            {list.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                <p className="eyebrow">{p.role === 'owner' ? 'OWNER' : 'MEMBER'}</p>
                <h3>{p.name}</h3>
                {p.description && <p className="muted" style={{ fontSize: 14 }}>{p.description}</p>}
                <div className="project-card-foot mono muted">
                  <span>{p.taskCount} tasks</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
