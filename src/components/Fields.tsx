import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Q, type EntryData, type QuestionKey } from '../lib/model';
export function Question({
  id,
  data,
  onChange,
  partner = false,
}: {
  id: QuestionKey;
  data: EntryData;
  onChange: (patch: Partial<EntryData>) => void;
  partner?: boolean;
}) {
  const groupId = useId();
  const q = Q[id];
  const multi = 'multi' in q && q.multi;
  const label = partner && 'partnerLabel' in q ? q.partnerLabel : q.label;
  return (
    <fieldset className="question">
      <legend>{label}</legend>
      <p className="field-hint">
        {multi ? 'Choose any that apply.' : 'Choose one, or leave unanswered.'}
      </p>
      <div className="answer-list">
        {q.opts.map((option) => {
          const value = data[id];
          const selected = Array.isArray(value) ? value.includes(option) : value === option;
          return (
            <label className="answer-row" key={option}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={groupId}
                checked={selected}
                onChange={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange({
                    [id]: multi
                      ? selected
                        ? current.filter((v) => v !== option)
                        : [...current, option]
                      : option,
                  });
                }}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      {!multi && data[id] && (
        <button type="button" className="text-button" onClick={() => onChange({ [id]: '' })}>
          Clear answer
        </button>
      )}
    </fieldset>
  );
}
export function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <div className="counter-field">
      <span className="field-title">{label}</span>
      <div className="counter">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(0, (value || 0) - 1))}
        >
          <Minus size={20} />
        </button>
        <output aria-live="polite">{value ?? '—'}</output>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(999, (value ?? 0) + 1))}
        >
          <Plus size={20} />
        </button>
        <button type="button" className="text-button" onClick={() => onChange(null)}>
          Not sure
        </button>
      </div>
    </div>
  );
}
