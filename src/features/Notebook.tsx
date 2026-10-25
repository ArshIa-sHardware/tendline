import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  entryDay,
  fmtDay,
  fmtDate,
  fmtTime,
  nameFor,
  summarize,
  type Entry,
  type Notebook as NotebookData,
} from '../lib/model';
import { EntrySummary } from '../components/EntrySummary';
import { Identity } from '../components/Identity';
export function Notebook({
  notebook,
  save,
  busy,
}: {
  notebook: NotebookData;
  save: (n: NotebookData, message: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [limit, setLimit] = useState(14),
    [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const visible = notebook.entries.filter(
    (e) =>
      type === 'all' ||
      (type === 'medication' ? e.kind === 'dose' || e.kind === 'lax' : e.kind === type),
  );
  const days = [...new Set(visible.map(entryDay))]
    .sort()
    .reverse()
    .filter(
      (day) =>
        !search ||
        visible.some(
          (e) =>
            entryDay(e) === day &&
            `${summarize(e)} ${nameFor(notebook, e.who)} ${day} ${fmtDate(day)}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        ),
    );
  async function remove(e: Entry) {
    if (confirm('Delete this observation? You can undo this immediately afterward.'))
      await save(
        { ...notebook, entries: notebook.entries.filter((x) => x.id !== e.id) },
        'Entry deleted',
      );
  }
  return (
    <>
      <header className="page-heading">
        <h1>Your journal</h1>
        <p>Your saved records, newest day first. Each name shows who added the information.</p>
      </header>
      <label className="journal-filter">
        Show records
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setLimit(14);
          }}
        >
          <option value="all">All records</option>
          <option value="night">Sleep</option>
          <option value="check">Symptoms</option>
          <option value="medication">Medication</option>
          <option value="doze">Daytime dozing</option>
          <option value="bm">Bowel movements</option>
        </select>
      </label>
      <label className="search">
        <Search size={22} />
        <span className="sr-only">Search notes</span>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(14);
          }}
          placeholder="Search a symptom, name, or date"
        />
      </label>
      {!days.length && (
        <div className="empty">
          <h2>{search ? 'No matching observations' : 'Begin with one observation'}</h2>
          <p>
            {search ? 'Try another word or date.' : 'Sleep notes and check-ins will appear here.'}
          </p>
        </div>
      )}
      <div className="journal">
        {days.slice(0, limit).map((day) => {
          const entries = visible.filter((e) => entryDay(e) === day),
            nights = entries.filter((e) => e.kind === 'night'),
            timed = entries
              .filter((e) => e.kind !== 'night')
              .sort((a, b) => a.t.localeCompare(b.t));
          return (
            <article className="journal-day" key={day}>
              <header className="day-heading">
                <time dateTime={day}>
                  <span>
                    {new Date(day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <strong>{new Date(day + 'T12:00:00').getDate()}</strong>
                </time>
                <div>
                  <h2>{fmtDay(day)}</h2>
                  <p>
                    {entries.length} {entries.length === 1 ? 'record' : 'records'} · {fmtDate(day)}
                  </p>
                </div>
              </header>
              <div className="day-body">
                {nights.length > 0 && (
                  <section
                    className="night-spread"
                    aria-label={`Sleep observations for ${day} ${fmtDate(day)}`}
                  >
                    <h3>Sleep logs · morning of {fmtDate(day)}</h3>
                    <div className="perspectives">
                      {nights.map((e) => (
                        <section className={`perspective perspective-${e.who}`} key={e.id}>
                          <Identity notebook={notebook} who={e.who} />
                          <EntrySummary entry={e} compact />
                          <details className="entry-actions">
                            <summary>Manage sleep note</summary>
                            <button
                              className="text-button danger"
                              disabled={busy}
                              onClick={() => void remove(e)}
                            >
                              Delete sleep note
                            </button>
                          </details>
                        </section>
                      ))}
                    </div>
                  </section>
                )}
                {timed.length > 0 && (
                  <details className="day-events" open={day === days[0]}>
                    <summary>
                      {timed.length} daytime {timed.length === 1 ? 'entry' : 'entries'}
                      <span>Medication, symptoms & other notes</span>
                    </summary>
                    <ol className="event-stream">
                      {timed.map((e) => (
                        <li key={e.id}>
                          <time dateTime={e.t}>{fmtTime(e.t)}</time>
                          <div className={`event-body event-${e.kind}`}>
                            <Identity notebook={notebook} who={e.who} compact />
                            <EntrySummary entry={e} />
                            <details className="entry-actions">
                              <summary>Manage entry</summary>
                              <button
                                className="text-button danger"
                                disabled={busy}
                                onClick={() => void remove(e)}
                              >
                                Delete {fmtTime(e.t)} entry
                              </button>
                            </details>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {days.length > limit && (
        <button className="button secondary full" onClick={() => setLimit((l) => l + 14)}>
          Show older days ({days.length - limit})
        </button>
      )}
    </>
  );
}
