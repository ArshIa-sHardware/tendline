import { nameFor, type Notebook, type Who } from '../lib/model';
export function Identity({
  notebook,
  who,
  compact = false,
}: {
  notebook: Notebook;
  who: Who;
  compact?: boolean;
}) {
  const name = nameFor(notebook, who);
  return (
    <span className={`identity identity-${who}`}>
      <span className="initial" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span>
        <strong>{name}</strong>
        {!compact && <small>{who === 'pd' ? 'Personal report' : 'Care partner observation'}</small>}
      </span>
    </span>
  );
}
export function IdentitySwitch({
  notebook,
  who,
  onChange,
}: {
  notebook: Notebook;
  who: Who;
  onChange: (who: Who) => void;
}) {
  return (
    <div className={`identity-select identity-${who}`}>
      <label>
        <span>Who is adding this?</span>
        <select
          aria-label="Who is writing"
          value={who}
          onChange={(e) => onChange(e.target.value as Who)}
        >
          <option value="pd">{nameFor(notebook, 'pd')} (patient)</option>
          <option value="cp">{nameFor(notebook, 'cp')} (care partner)</option>
        </select>
      </label>
    </div>
  );
}
