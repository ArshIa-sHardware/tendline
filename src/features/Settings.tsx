import { useState, type ChangeEvent } from 'react';
import { Download, Upload, ShieldCheck } from 'lucide-react';
import { backup, csvText, download } from '../lib/export';
import { dayKey, freshState, parseBackup, SHOW_LABELS, type Notebook } from '../lib/model';
export function Settings({
  notebook,
  save,
  busy,
  demo,
  offline,
  toggleOffline,
}: {
  notebook: Notebook;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
  demo: boolean;
  offline: boolean;
  toggleOffline: (enabled: boolean) => void;
}) {
  const [names, setNames] = useState(notebook.names),
    [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bedside-theme') || 'system';
    } catch {
      return 'system';
    }
  });
  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || demo) return;
    setError('');
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 12 MB.');
      await confirmImport(parseBackup(JSON.parse(await file.text())));
    } catch {
      setError(
        'Could not import this file. Choose a valid Bedside Notebook JSON backup (maximum 12 MB). Your current notes were kept.',
      );
    }
  }
  async function confirmImport(next: Notebook) {
    if (
      !window.confirm(
        `Replace this notebook with ${next.entries.length} entries from the backup? Download your current backup first. This change will sync to your account.`,
      )
    )
      return;
    if (await save(next, 'Backup imported')) setNames(next.names);
  }
  async function importOldDevice() {
    setError('');
    try {
      const raw = localStorage.getItem('bedside-notebook-v1');
      if (!raw) {
        setError(
          'No older notebook was found at this website address. Export JSON from your old app, then use Import backup.',
        );
        return;
      }
      await confirmImport(parseBackup(JSON.parse(raw)));
    } catch {
      setError('The older notebook could not be read. Export it as JSON from the old app first.');
    }
  }
  function changeTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem('bedside-theme', value);
    } catch {
      /* Appearance can still change in memory. */
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Notebook settings</h1>
        <p>A few preferences to help this feel like your notebook.</p>
      </div>
      <div className="stack">
        <section className="card">
          <h2>Who keeps this notebook</h2>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void save({ ...notebook, names }, 'Names updated');
            }}
          >
            <div className="row-two">
              <label>
                Person with Parkinson’s
                <input
                  value={names.pd}
                  maxLength={200}
                  onChange={(e) => setNames((n) => ({ ...n, pd: e.target.value }))}
                  placeholder="First name or nickname"
                />
              </label>
              <label>
                Care partner
                <input
                  value={names.cp}
                  maxLength={200}
                  onChange={(e) => setNames((n) => ({ ...n, cp: e.target.value }))}
                  placeholder="First name or nickname"
                />
              </label>
            </div>
            <button className="button secondary" disabled={busy}>
              Save names
            </button>
          </form>
          <p className="fine-print">
            One account holds this journal. “Who is adding this?” labels the author of a record; it
            does not switch accounts or grant another person access. Separate caregiver sign-in and
            invitations are not available yet.
          </p>
        </section>
        <section className="card">
          <h2>Comfort and appearance</h2>
          <label>
            Text size
            <select
              value={notebook.textScale ?? (notebook.larger ? 125 : 100)}
              disabled={busy}
              onChange={(e) =>
                void save(
                  {
                    ...notebook,
                    larger: false,
                    textScale: Number(e.target.value) as 100 | 125 | 150 | 200,
                  },
                  'Text size updated',
                )
              }
            >
              <option value={100}>Standard · 100%</option>
              <option value={125}>Larger · 125%</option>
              <option value={150}>Extra large · 150%</option>
              <option value={200}>Largest · 200%</option>
            </select>
          </label>
          <label>
            Theme
            <select value={theme} onChange={(e) => changeTheme(e.target.value)}>
              <option value="system">Follow device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </section>
        <section className="card">
          <h2>Choose what to track</h2>
          <p className="muted">Turning off a question keeps your existing notes.</p>
          {Object.entries(SHOW_LABELS).map(([key, label]) => (
            <label className="toggle" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notebook.show[key] ?? true}
                disabled={busy}
                onChange={(e) =>
                  void save(
                    { ...notebook, show: { ...notebook.show, [key]: e.target.checked } },
                    'Tracking preferences updated',
                  )
                }
              />
            </label>
          ))}
        </section>
        <section className="card">
          <h2>
            <ShieldCheck size={21} /> Your notes and privacy
          </h2>
          <p className="muted">
            When signed in, notes are saved to your private Supabase account notebook. Your account
            can open it on another device. Exports contain your notes and are not encrypted.
          </p>
          {!demo && (
            <>
              <label className="toggle">
                <span>Keep a copy on this device for offline use</span>
                <input
                  type="checkbox"
                  checked={offline}
                  onChange={(e) => toggleOffline(e.target.checked)}
                />
              </label>
              <p className="fine-print">
                Use only on a trusted device. This copy is not encrypted. Offline edits wait here
                until you choose Sync. Signing out removes this account’s local notebook copy.
              </p>
            </>
          )}
          <div className="row-two">
            <button className="button secondary" onClick={() => backup(notebook)}>
              <Download size={18} />
              Download JSON backup
            </button>
            <button
              className="button secondary"
              onClick={() =>
                download(
                  `bedside-entries-${dayKey()}.csv`,
                  csvText(notebook),
                  'text/csv;charset=utf-8',
                )
              }
            >
              Export spreadsheet CSV
            </button>
          </div>
          <label className="file-input">
            <span>
              <Upload size={18} /> Import JSON backup
            </span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => void restore(e)}
              disabled={demo || busy}
            />
          </label>
          <button
            className="text-button"
            disabled={demo || busy}
            onClick={() => void importOldDevice()}
          >
            Import the old notebook from this browser
          </button>
          <p className="fine-print">
            Imports replace your notebook after confirmation. Older v2/v3 JSON backups are
            supported. {demo && 'Sign in to import your own notes.'}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button danger"
            disabled={busy}
            onClick={async () => {
              if (
                window.confirm(
                  'Erase every entry and question in this notebook? Download a backup first. This will sync to your account.',
                )
              )
                await save(
                  {
                    ...freshState(),
                    appointments: notebook.appointments,
                    example: notebook.example,
                    names: notebook.names,
                    larger: notebook.larger,
                    textScale: notebook.textScale,
                    show: notebook.show,
                  },
                  'Notebook cleared',
                );
            }}
          >
            Erase notebook entries
          </button>
        </section>
        <section className="card">
          <h2>Install on your device</h2>
          <p className="muted">
            In Safari on iPhone, choose Share → Add to Home Screen. In Chrome, use Install app. Open
            online once to cache the app. Enable the device copy above to read and write your notes
            offline.
          </p>
          <p className="fine-print">
            A notebook for home observations, not an emergency monitoring service.
          </p>
        </section>
      </div>
    </>
  );
}
