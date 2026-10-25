import { useState, type FormEvent } from 'react';
import {
  atTime,
  dayKey,
  fmtTime,
  fmtDate,
  nameFor,
  nearbyDose,
  timeVal,
  medicationDetailsSchema,
  type Notebook,
  type Who,
  type Entry,
} from '../lib/model';
export function Medication({
  notebook,
  who,
  save,
  busy,
  initialLaxative = false,
}: {
  notebook: Notebook;
  who: Who;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
  initialLaxative?: boolean;
}) {
  const [date, setDate] = useState(dayKey()),
    [time, setTime] = useState(timeVal());
  const [name, setName] = useState(''),
    [strength, setStrength] = useState(''),
    [amount, setAmount] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState('');
  const [laxative, setLaxative] = useState(initialLaxative);
  const recent = [...notebook.entries]
    .filter((e) => (e.kind === 'dose' || e.kind === 'lax') && e.medication)
    .reverse();
  const medicines = [
    ...new Map(
      recent.map((e) => {
        const m = 'medication' in e ? e.medication! : null;
        return [`${m?.name}\0${m?.strength}`, m];
      }),
    ).values(),
  ].filter(Boolean);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const medication = medicationDetailsSchema.parse({ name, strength, amount, note });
      const t = atTime(date, time);
      if (
        nearbyDose(notebook.entries, t, medication.name) &&
        !confirm(
          'This medicine, or an older unnamed dose, was recorded within 10 minutes. Record another dose?',
        )
      )
        return;
      const entry: Entry = {
        id: crypto.randomUUID(),
        who,
        kind: laxative ? 'lax' : 'dose',
        t,
        medication,
      };
      if (
        await save(
          { ...notebook, entries: [...notebook.entries, entry] },
          `${medication.name} dose recorded`,
        )
      ) {
        setAmount('');
        setNote('');
      }
    } catch (e) {
      setError(
        e instanceof Error && !('issues' in e)
          ? e.message
          : 'Enter a medicine name and the amount actually taken.',
      );
    }
  }
  return (
    <>
      <header className="page-heading">
        <h1>Log medication</h1>
        <p>
          For {nameFor(notebook, 'pd')}. Recorded by {nameFor(notebook, who)}.
        </p>
      </header>
      <form className="medication-form stack" onSubmit={submit}>
        {medicines.length > 0 && (
          <label>
            Use a recently recorded medicine
            <select
              defaultValue=""
              onChange={(e) => {
                const m = medicines[Number(e.target.value)];
                if (m) {
                  setName(m.name);
                  setStrength(m.strength || '');
                  setAmount('');
                }
              }}
            >
              <option value="" disabled>
                Choose a medicine, or enter one below
              </option>
              {medicines.map((m, i) => (
                <option key={i} value={i}>
                  {m!.name}
                  {m!.strength ? ` · ${m!.strength}` : ''}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Names from your records, not a prescribed medication list.
            </span>
          </label>
        )}
        <label>
          Medicine name
          <input
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copy the name on the medicine label"
          />
        </label>
        <div className="row-two">
          <label>
            Strength on label (optional)
            <input
              maxLength={100}
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="Include units, if known"
            />
          </label>
          <label>
            Amount taken
            <input
              required
              maxLength={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="For example, 1 tablet or 5 mL"
            />
          </label>
        </div>
        <div className="row-two">
          <label>
            Date taken
            <input
              required
              type="date"
              max={dayKey()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Time taken
            <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDate(dayKey());
            setTime(timeVal());
          }}
        >
          Set to now
        </button>
        <label className="check-option">
          <input
            type="checkbox"
            checked={laxative}
            onChange={(e) => setLaxative(e.target.checked)}
          />
          This medicine is a laxative
        </label>
        <label>
          Note (optional)
          <textarea
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you want to remember about this dose"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save medication dose'}
        </button>
      </form>
      <section className="recent">
        <h2>Recent medication records</h2>
        {recent.slice(0, 5).map((e) => (
          <div className="medication-recent" key={e.id}>
            <strong>{'medication' in e ? e.medication?.name : ''}</strong>
            <span>
              {'medication' in e ? e.medication?.amount : ''} ·{' '}
              {'t' in e ? `${fmtDate(dayKey(new Date(e.t)))} · ${fmtTime(e.t)}` : ''}
            </span>
          </div>
        ))}
        {!recent.length && (
          <p className="muted">Named doses will appear here after you save them.</p>
        )}
      </section>
    </>
  );
}
