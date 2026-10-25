import { useState, type FormEvent } from 'react';
import { Pill, BedSingle, ListChecks, CirclePlus } from 'lucide-react';
import type { View } from '../components/Workspace';
import { Question } from '../components/Fields';
import {
  atTime,
  Q,
  dayKey,
  timeVal,
  nameFor,
  type Entry,
  type EntryData,
  type Notebook,
  type Who,
  type QuestionKey,
} from '../lib/model';
const quick = [
  { kind: 'dose', title: 'Log a medicine dose', icon: Pill },
  { kind: 'doze', title: 'Dozed off', icon: BedSingle },
  { kind: 'bm', title: 'Bowel movement', icon: ListChecks },
  { kind: 'lax', title: 'Log a laxative dose', icon: CirclePlus },
] as const;
export function CheckIn({
  notebook,
  who,
  save,
  busy,
  go,
}: {
  notebook: Notebook;
  who: Who;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
  go: (v: View) => void;
}) {
  const [date, setDate] = useState(dayKey()),
    [time, setTime] = useState(timeVal());
  const [data, setData] = useState<EntryData>({}),
    [error, setError] = useState('');
  async function log(kind: 'dose' | 'doze' | 'bm' | 'lax' | 'check') {
    if (kind === 'dose' || kind === 'lax') {
      go(kind === 'lax' ? 'laxative' : 'medication');
      return;
    }
    setError('');
    try {
      if (
        kind === 'check' &&
        !Object.values(data).some((v) =>
          Array.isArray(v) ? v.length : typeof v === 'string' ? v.trim() : v,
        )
      )
        throw new Error('Choose at least one answer or write a note.');
      const base = { id: crypto.randomUUID(), who, t: atTime(date, time) };
      const entry: Entry = kind === 'check' ? { ...base, kind, data } : { ...base, kind };
      if (
        await save(
          { ...notebook, entries: [...notebook.entries, entry] },
          kind === 'check' ? 'Check-in recorded' : 'Entry recorded',
        )
      ) {
        if (kind === 'check') setData({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check the date and time.');
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Log symptoms</h1>
        <p>Writing as {nameFor(notebook, who)}. Tap what’s true and leave the rest.</p>
      </div>
      <div className="stack checkin-layout">
        <section className="card">
          <div className="row-two">
            <label>
              Date
              <input
                type="date"
                required
                max={dayKey()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Time
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setDate(dayKey());
              setTime(timeVal());
            }}
          >
            Set to now
          </button>
          <h2>Quick record</h2>
          <div className="quick-grid">
            {quick.map(({ kind, title, icon: Icon }) => (
              <button
                disabled={busy}
                className="quick-button"
                key={kind}
                onClick={() => void log(kind)}
              >
                <Icon size={22} />
                <span>{title}</span>
                <span className="field-hint">
                  {kind === 'dose' || kind === 'lax'
                    ? 'Choose medicine and amount'
                    : `Record at ${time}`}
                </span>
              </button>
            ))}
          </div>
        </section>
        <form
          className="card form-card"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void log('check');
          }}
        >
          <h2>What would you like to note?</h2>
          <p className="muted">Open a topic. You can answer just one.</p>
          {(['meds', 'moving', 'energy', 'stomach', 'mood', 'food'] as QuestionKey[])
            .filter((k) => notebook.show[k])
            .map((k) => (
              <details className="topic" key={k}>
                <summary>
                  {Q[k].label}
                  <span>
                    {Array.isArray(data[k])
                      ? (data[k] as string[]).join(', ') || 'Add details'
                      : data[k] || 'Add details'}
                  </span>
                </summary>
                {k === 'meds' && (
                  <div className="timing-help">
                    <p>
                      This describes symptoms before or after a medicine dose. It does not record
                      taking medicine.
                    </p>
                    <p>
                      “Wearing off” means you noticed symptoms returning. Skip this if you’re
                      unsure.
                    </p>
                    <label>
                      Which medicine? (optional)
                      <input
                        maxLength={200}
                        value={data.medicineContext || ''}
                        onChange={(e) =>
                          setData((d) => ({ ...d, medicineContext: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                )}
                <Question
                  id={k}
                  data={data}
                  onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
                />
              </details>
            ))}
          <label>
            Note <span className="optional">Optional</span>
            <textarea
              maxLength={50000}
              value={data.note || ''}
              onChange={(e) => setData((d) => ({ ...d, note: e.target.value }))}
              placeholder="What else was happening?"
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save check-in'}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
