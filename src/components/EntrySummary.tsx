import { Q, KIND_LABEL, fmtClock, type Entry, type QuestionKey } from '../lib/model';
export function EntrySummary({ entry, compact = false }: { entry: Entry; compact?: boolean }) {
  if (entry.kind !== 'night' && entry.kind !== 'check')
    return entry.medication ? (
      <div>
        <h3>{entry.medication.name}</h3>
        <dl className="observation-facts">
          {entry.medication.strength && (
            <div>
              <dt>Strength</dt>
              <dd>{entry.medication.strength}</dd>
            </div>
          )}
          <div>
            <dt>Amount taken</dt>
            <dd>{entry.medication.amount}</dd>
          </div>
        </dl>
        {entry.medication.note && <p className="narrative">{entry.medication.note}</p>}
      </div>
    ) : (
      <div>
        <p className="event-label">{KIND_LABEL[entry.kind]}</p>
        {(entry.kind === 'dose' || entry.kind === 'lax') && (
          <p className="field-hint">Medicine and amount were not specified in this older record.</p>
        )}
      </div>
    );
  const d = entry.data;
  const measurements =
    entry.kind === 'night'
      ? [
          ['Bedtime', d.bed ? fmtClock(d.bed) : undefined],
          ['Wake time', d.up ? fmtClock(d.up) : undefined],
          ['Awakenings', d.wakes],
          ['Bathroom trips', d.bathroom],
        ].filter(([, v]) => v !== undefined && v !== null && v !== '')
      : [];
  const keys: QuestionKey[] =
    entry.kind === 'night'
      ? ['asleep', 'reasons', 'rested', 'obs', 'own']
      : ['meds', 'moving', 'energy', 'stomach', 'mood', 'food'];
  const labels: Partial<Record<QuestionKey, string>> = {
    asleep: 'Falling asleep',
    reasons: 'Disturbed by',
    rested: 'Morning feeling',
    obs: 'Observed overnight',
    own: 'Care partner’s sleep',
  };
  const facts = keys.filter((k) =>
    Array.isArray(d[k]) ? (d[k] as string[]).length : Boolean(d[k]),
  );
  const important = d.moving === 'Fell' || d.moving === 'Froze' || d.obs?.includes('Fell');
  return (
    <div className={`entry-summary ${compact ? 'compact' : ''}`}>
      {d.medicineContext && <p className="field-hint">Medicine context: {d.medicineContext}</p>}
      {important && (
        <p className="event-flag">
          {d.moving === 'Froze' ? 'Freezing episode recorded' : 'Fall recorded'}
        </p>
      )}
      {measurements.length > 0 && (
        <dl className="sleep-measures">
          {measurements.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {compact && entry.kind === 'night' ? (
        <>
          {(d.rested || d.own) && (
            <dl className="observation-facts">
              <div>
                <dt>{d.rested ? 'Morning feeling' : 'Care partner’s sleep'}</dt>
                <dd>{d.rested || d.own}</dd>
              </div>
            </dl>
          )}
          <details className="summary-detail">
            <summary>More sleep details</summary>{' '}
            {facts.length > 0 && (
              <dl className="observation-facts">
                {facts
                  .filter((k) => k !== 'rested' && k !== 'own')
                  .map((k) => (
                    <div key={k}>
                      <dt>{labels[k] || Q[k].label}</dt>
                      <dd>
                        {Array.isArray(d[k]) ? (
                          <ul>
                            {(d[k] as string[]).map((v) => (
                              <li key={v}>{v}</li>
                            ))}
                          </ul>
                        ) : (
                          d[k]
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            {d.note && (
              <div className="narrative">
                <span>In their words</span>
                <p>{d.note}</p>
              </div>
            )}
          </details>
        </>
      ) : (
        <>
          {' '}
          {facts.length > 0 && (
            <dl className="observation-facts">
              {facts.map((k) => (
                <div key={k}>
                  <dt>{labels[k] || Q[k].label}</dt>
                  <dd>
                    {Array.isArray(d[k]) ? (
                      <ul>
                        {(d[k] as string[]).map((v) => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    ) : (
                      d[k]
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {d.note && (
            <div className="narrative">
              <span>In their words</span>
              <p>{d.note}</p>
            </div>
          )}
        </>
      )}

      {!measurements.length && !facts.length && !d.note && (
        <p className="muted">No details recorded.</p>
      )}
    </div>
  );
}
