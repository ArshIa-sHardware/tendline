import { useEffect, useState, type FormEvent } from 'react';
import { Identity } from '../components/Identity';
import { Counter, Question } from '../components/Fields';
import { dateSchema, dayKey, nameFor, type EntryData, type Notebook, type Who } from '../lib/model';
export function Sleep({
  notebook,
  who,
  save,
  busy,
}: {
  notebook: Notebook;
  who: Who;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [date, setDate] = useState(dayKey());
  const existing = notebook.entries.find(
    (e) => e.kind === 'night' && e.date === date && e.who === who,
  );
  const [draft, setDraft] = useState<EntryData>({});
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(existing && existing.kind === 'night' ? existing.data : {});
  }, [date, who, existing]);
  const patch = (p: Partial<EntryData>) => setDraft((d) => ({ ...d, ...p }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!dateSchema.safeParse(date).success || date > dayKey()) {
      setError('Choose today or an earlier morning.');
      return;
    }
    const entry = {
      id: existing?.id || crypto.randomUUID(),
      kind: 'night' as const,
      date,
      who,
      data: draft,
    };
    await save(
      { ...notebook, entries: [...notebook.entries.filter((e) => e.id !== entry.id), entry] },
      'Sleep note recorded',
    );
  }
  return (
    <>
      <div className="page-heading">
        <h1>How was last night?</h1>
        <p>
          {who === 'pd'
            ? 'A few details, while they’re still fresh. Skip anything you’re not sure about.'
            : `What did you notice about ${nameFor(notebook, 'pd')}? Your own sleep matters, too.`}
        </p>
      </div>
      <form className="sleep-form" onSubmit={submit}>
        <div className="form-context">
          <Identity notebook={notebook} who={who} />
          <label>
            Morning date
            <input
              type="date"
              max={dayKey()}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <span className="field-hint">The morning after this night’s sleep.</span>
          </label>
        </div>
        <section className="form-section">
          <header>
            <span className="section-number">01</span>
            <div>
              <h2>{who === 'pd' ? 'Your night' : 'Their night'}</h2>
              <p>Approximate answers are welcome.</p>
            </div>
          </header>
          <div className="section-fields">
            {who === 'pd' && (
              <div className="row-two">
                <label>
                  Went to bed
                  <input
                    type="time"
                    value={draft.bed || ''}
                    onChange={(e) => patch({ bed: e.target.value })}
                  />
                </label>
                <label>
                  Up for the day
                  <input
                    type="time"
                    value={draft.up || ''}
                    onChange={(e) => patch({ up: e.target.value })}
                  />
                </label>
              </div>
            )}
            {who === 'pd' && notebook.show.asleep && (
              <Question id="asleep" data={draft} onChange={patch} />
            )}
            <div className="row-two">
              {notebook.show.wakes && (
                <Counter
                  label="Times woken up"
                  value={draft.wakes}
                  onChange={(wakes) => patch({ wakes })}
                />
              )}{' '}
              {notebook.show.bathroom && (
                <Counter
                  label="Bathroom trips"
                  value={draft.bathroom}
                  onChange={(bathroom) => patch({ bathroom })}
                />
              )}
            </div>
          </div>
        </section>
        <section className="form-section">
          <header>
            <span className="section-number">02</span>
            <div>
              <h2>What you noticed</h2>
              <p>Only choose what you remember.</p>
            </div>
          </header>
          <div className="section-fields">
            {notebook.show.reasons && (
              <Question id="reasons" data={draft} onChange={patch} partner={who === 'cp'} />
            )}
            {who === 'cp' && notebook.show.obs && (
              <Question id="obs" data={draft} onChange={patch} />
            )}
            {who === 'pd' && notebook.show.rested && (
              <Question id="rested" data={draft} onChange={patch} />
            )}
            {who === 'cp' && notebook.show.own && (
              <Question id="own" data={draft} onChange={patch} />
            )}
          </div>
        </section>
        <section className="form-section">
          <header>
            <span className="section-number">03</span>
            <div>
              <h2>In your words</h2>
              <p>A detail you want to remember.</p>
            </div>
          </header>
          <div className="section-fields">
            <label>
              Anything else? <span className="optional">Optional</span>
              <textarea
                value={draft.note || ''}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="A detail you’d like to remember…"
                maxLength={50000}
              />
            </label>
          </div>
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-save">
          <p>Unanswered questions stay blank.</p>
          <button disabled={busy} className="button primary">
            {busy ? 'Saving…' : existing ? 'Update this night' : 'Save this night'}
          </button>
        </div>
      </form>
    </>
  );
}
