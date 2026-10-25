import { ArrowUpRight, Plus, ArrowRight } from 'lucide-react';
import { dayKey, entryDay, fmtTime, fmtDay, nameFor, type Notebook, type Who } from '../lib/model';
import type { View } from '../components/Workspace';
import { RecordNav } from '../components/RecordNav';
import { Identity } from '../components/Identity';
import { EntrySummary } from '../components/EntrySummary';
export function Home({
  notebook,
  who,
  go,
}: {
  notebook: Notebook;
  who: Who;
  go: (v: View) => void;
}) {
  const today = dayKey();
  const sleep = notebook.entries.find(
    (e) => e.kind === 'night' && e.date === today && e.who === who,
  );
  const recent = [...notebook.entries]
    .filter((e) => e.kind !== 'night')
    .sort((a, b) => ('t' in b ? b.t : '').localeCompare('t' in a ? a.t : ''))
    .slice(0, 3);
  const next = [...notebook.appointments]
    .filter((a) => a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  return (
    <>
      <header className="page-heading home-heading">
        <div>
          <p className="date-heading">{fmtDay(today)}</p>
          <h1>The days between visits.</h1>
          <p>Your observations, together in one place.</p>
        </div>
        <button className="button primary" onClick={() => go('record')}>
          <Plus size={20} /> Record an observation
        </button>
      </header>
      <RecordNav view="home" go={go} />
      <div className="overview">
        <section className="sleep-overview">
          <div className="section-heading between">
            <h2>Last night’s sleep</h2>
            <span className="section-caption">Sleep</span>
          </div>
          <Identity notebook={notebook} who={who} />
          <p className="field-hint sleep-source">
            {notebook.example
              ? 'Fictional example, entered through Log sleep.'
              : 'From the sleep log for this morning.'}
          </p>
          {sleep ? (
            <EntrySummary entry={sleep} compact />
          ) : (
            <div className="sleep-empty">
              <p>A place for how the night went.</p>
              <span>Record what you remember. Every question is optional.</span>
            </div>
          )}
          <button className="text-button" onClick={() => go('sleep')}>
            {sleep ? 'Edit sleep log' : 'Log sleep'}
            <ArrowRight size={20} />
          </button>
        </section>
        <aside className="visit-overview">
          <div className="section-heading between">
            <h2>Looking ahead</h2>
            <ArrowUpRight size={23} />
          </div>
          {next ? (
            <>
              <time dateTime={next.date} className="visit-date">
                {fmtDay(next.date)}
              </time>
              <h3>{next.title}</h3>
              <p>
                {next.time || 'Time to be arranged'}
                {next.location && ` · ${next.location}`}
              </p>
              {next.notes && <p className="visit-preparation">{next.notes}</p>}
            </>
          ) : (
            <>
              <h3>Your next conversation</h3>
              <p>Keep appointments and questions ready for your care team.</p>
            </>
          )}
          <button className="button secondary" onClick={() => go('visit')}>
            Prepare a visit note
          </button>
          <button className="text-button" onClick={() => go('appointments')}>
            Open calendar <ArrowRight size={18} />
          </button>
        </aside>
      </div>
      <section className="recent">
        <div className="section-heading between">
          <div>
            <h2>From your journal</h2>
            <p className="muted">Recent moments, in the words of each person.</p>
          </div>
          <button className="text-button" onClick={() => go('notebook')}>
            View journal <ArrowRight size={18} />
          </button>
        </div>
        {recent.length ? (
          recent.map((e) => (
            <article className="journal-preview" key={e.id}>
              <div className="preview-meta">
                <time>
                  {entryDay(e) === today ? 'Today' : fmtDay(entryDay(e))}
                  <strong>{'t' in e ? fmtTime(e.t) : ''}</strong>
                </time>
                <Identity notebook={notebook} who={e.who} compact />
              </div>
              <EntrySummary entry={e} compact />
            </article>
          ))
        ) : (
          <div className="empty">
            <h3>No daytime observations yet</h3>
            <p>A dose, a symptom, or a few words is enough to start.</p>
          </div>
        )}
      </section>
      <p className="quiet-context">
        Recording as {nameFor(notebook, who)}. Change the name at the top to add the other person’s
        perspective.
      </p>
    </>
  );
}
