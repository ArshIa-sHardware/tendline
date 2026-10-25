import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Home as HomeIcon,
  CalendarDays,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { Medication } from '../features/Medication';
import { RecordNav, RecordStart } from './RecordNav';
import { Brand } from './Brand';
import { IdentitySwitch } from './Identity';
import { useNotebook } from '../hooks/useNotebook';
import { type Notebook as NotebookData, type Who } from '../lib/model';
import { backup } from '../lib/export';
import { clearCache } from '../lib/repository';
import { supabase } from '../lib/supabase';
import { Appointments } from '../features/Appointments';
import { Home } from '../features/Home';
import { Sleep } from '../features/Sleep';
import { CheckIn } from '../features/CheckIn';
import { Notebook } from '../features/Notebook';
import { Visit } from '../features/Visit';
import { Settings } from '../features/Settings';
export type View =
  | 'record'
  | 'laxative'
  | 'medication'
  | 'appointments'
  | 'home'
  | 'sleep'
  | 'check'
  | 'notebook'
  | 'visit'
  | 'settings';
const nav = [
  { id: 'home', label: 'Today', icon: HomeIcon },
  { id: 'appointments', label: 'Calendar', icon: CalendarDays },
  { id: 'notebook', label: 'Journal', icon: BookOpen },
  { id: 'visit', label: 'Visit note', icon: FileText },
] as const;
export function Workspace({
  owner,
  email,
  exitDemo,
}: {
  owner: string | null;
  email?: string;
  exitDemo: () => void;
}) {
  const store = useNotebook(owner),
    n = store.notebook;
  const [view, setView] = useState<View>('home'),
    [who, setWho] = useState<Who>('pd');
  const [notice, setNotice] = useState(''),
    [undo, setUndo] = useState<NotebookData | null>(null);
  const main = useRef<HTMLElement>(null);
  const demo = !owner;
  function go(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
  }
  async function save(next: NotebookData, message: string) {
    const before = n;
    const accepted = await store.commit(next);
    if (accepted) {
      setUndo(before || null);
      setNotice(demo ? message : `${message}. Check the save status above.`);
    }
    return accepted;
  }
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => {
      setNotice('');
      setUndo(null);
    }, 12000);
    return () => clearTimeout(t);
  }, [notice]);
  async function logout() {
    if (demo) {
      exitDemo();
      return;
    }
    if (
      store.pending &&
      !window.confirm(
        'Some notes have not synced. Signing out removes the local notebook copy. Cancel and download a backup first if you need these notes. Sign out anyway?',
      )
    )
      return;
    const { error } = await supabase!.auth.signOut({ scope: 'local' });
    if (error) {
      setNotice(error.message);
      return;
    }
    try {
      clearCache(owner!);
    } catch {
      /* The UI is still unmounted by auth state. */
    }
  }
  const status = demo
    ? 'Demo mode'
    : store.busy
      ? 'Saving…'
      : store.pending
        ? store.cached
          ? 'On this device · cloud sync pending'
          : 'Not saved · keep this page open'
        : n
          ? 'Saved to your account'
          : 'Connecting to your notebook…';
  const locked = store.busy || store.conflict;
  return (
    <div
      className={`app-shell ${(n?.textScale ?? (n?.larger ? 125 : 100)) >= 150 ? 'text-enlarged' : ''}`}
      style={{ fontSize: `${(20 * (n?.textScale ?? (n?.larger ? 125 : 100))) / 100}px` }}
    >
      <a href="#main" className="skip-link">
        Skip to notebook
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => go('home')}>
          <Brand />
        </button>

        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-settings ${view === 'settings' ? 'active' : ''}`}
            aria-current={view === 'settings' ? 'page' : undefined}
            onClick={() => go('settings')}
          >
            <SettingsIcon size={20} />
            Settings
          </button>
          <div className="account">
            <span className="account-avatar">{demo ? 'W' : email?.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{demo ? 'Demo household' : 'Your account'}</strong>
              <small>{demo ? 'Walt & June' : email}</small>
            </div>
          </div>
          <button
            className="text-button logout"
            disabled={store.busy}
            onClick={() => void logout()}
          >
            <LogOut size={17} />
            {demo ? 'Back to sign in' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span className="workspace-label">Your care journal</span>
          {n && (
            <IdentitySwitch
              notebook={n}
              who={who}
              onChange={(w) => {
                setWho(w);
                setUndo(null);
              }}
            />
          )}
          <span className={`save-status ${store.pending ? 'pending' : ''}`} role="status">
            <Cloud size={17} />
            {status}
          </span>
          {!demo && (
            <button
              className="mobile-account icon-button"
              aria-label={demo ? 'Exit example' : 'Sign out'}
              disabled={store.busy}
              onClick={() => void logout()}
            >
              <LogOut size={18} />
              <span>{demo ? 'Exit example' : 'Sign out'}</span>
            </button>
          )}
        </header>
        <main id="main" tabIndex={-1} ref={main}>
          {demo && (
            <div className="demo-banner">
              <span>
                <strong>Demo mode.</strong> Practice with fictional notes; changes reset when you reload.
              </span>
              <button onClick={exitDemo}>Sign in →</button>
            </div>
          )}
          {!demo && (store.error || store.pending || !store.online) && (
            <section className="notice sync-notice" aria-label="Notebook save status">
              <strong>
                {store.conflict
                  ? 'Another copy changed'
                  : !store.online
                    ? 'You’re offline'
                    : store.pending
                      ? 'Notes waiting to sync'
                      : 'Could not connect'}
              </strong>
              <p>{store.error || 'Reconnect to sync your notes.'}</p>
              {store.pending && (
                <p>
                  {store.cached
                    ? 'Your changes are stored on this device.'
                    : 'Your changes are only in this open page. Download a backup before leaving.'}
                </p>
              )}
              <div className="button-row">
                {!store.conflict && (
                  <button
                    className="button secondary"
                    disabled={store.busy || !store.online}
                    onClick={() => void store.sync()}
                  >
                    <RefreshCw size={16} />
                    Retry sync
                  </button>
                )}
                {n && (
                  <button className="button secondary" onClick={() => backup(n)}>
                    Download current notes
                  </button>
                )}
                {store.conflict && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        confirm(
                          'Load the cloud copy and discard pending edits on this device? Download your pending notes first.',
                        )
                      )
                        void store.reload();
                    }}
                  >
                    Load cloud copy
                  </button>
                )}
              </div>
            </section>
          )}
          {store.loading ? (
            <div className="empty" role="status">
              Opening your notebook…
            </div>
          ) : !n ? (
            <div className="card">
              <h1>Your notebook couldn’t open</h1>
              <p>Check your connection and make sure the database migration has been applied.</p>
              <button className="button primary" onClick={() => void store.reload()}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {['sleep', 'check', 'medication', 'laxative'].includes(view) && (
                <RecordNav view={view} go={go} />
              )}
              {view === 'record' && <RecordStart go={go} />}
              {(view === 'medication' || view === 'laxative') && (
                <Medication
                  key={who + view}
                  initialLaxative={view === 'laxative'}
                  notebook={n}
                  who={who}
                  save={save}
                  busy={locked}
                />
              )}
              {view === 'home' && <Home notebook={n} who={who} go={go} />}
              {view === 'appointments' && <Appointments notebook={n} save={save} busy={locked} />}
              {view === 'sleep' && <Sleep notebook={n} who={who} save={save} busy={locked} />}
              {view === 'check' && (
                <CheckIn key={who} notebook={n} who={who} save={save} busy={locked} go={go} />
              )}
              {view === 'notebook' && <Notebook notebook={n} save={save} busy={locked} />}
              {view === 'visit' && <Visit notebook={n} save={save} busy={locked} />}
              {view === 'settings' && (
                <Settings
                  notebook={n}
                  save={save}
                  busy={locked}
                  demo={demo}
                  offline={store.offline}
                  toggleOffline={store.toggleOffline}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            tendline.
            {!demo && (
              <button
                className="text-button"
                disabled={store.busy || store.pending}
                onClick={() => void store.reload()}
              >
                Refresh from cloud
              </button>
            )}
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          aria-current={view === 'settings' ? 'page' : undefined}
          onClick={() => go('settings')}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          {undo && (
            <button
              disabled={locked}
              onClick={async () => {
                if (await store.commit(undo)) {
                  setUndo(null);
                  setNotice('Change undone.');
                }
              }}
            >
              Undo
            </button>
          )}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
