import { useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { dayKey, fmtDate, type Notebook } from '../lib/model';
import { metricValue, reportText, visitReport } from '../lib/report';
import { download } from '../lib/export';
export function Visit({
  notebook,
  save,
  busy,
}: {
  notebook: Notebook;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [days, setDays] = useState(14),
    [questions, setQuestions] = useState(notebook.questions),
    [status, setStatus] = useState('');
  const report = useMemo(() => visitReport(notebook, days), [notebook, days]);
  const generated = reportText({ ...notebook, questions }, report);
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? generated;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Visit note copied.');
    } catch {
      setStatus('Select the visit note below and copy it, or download the text file.');
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Your visit brief</h1>
        <p>What changed, what stayed the same, and what you’d like to ask.</p>
      </div>
      <div className="visit-controls">
        <div className="segmented" aria-label="Report period">
          {[7, 14, 28].map((n) => (
            <button
              key={n}
              aria-pressed={days === n}
              onClick={() => {
                setDays(n);
                setEdited(null);
              }}
            >
              {n / 7} {n === 7 ? 'week' : 'weeks'}
            </button>
          ))}
        </div>
        <span className="muted">
          {report.nights} nights · {report.recordedDays} days recorded
        </span>
      </div>
      <p className="fine-print">
        {fmtDate(report.start)} – {fmtDate(report.end)}. Comparisons use recorded nights and days
        only. Missing notes do not mean symptoms were absent.
      </p>
      <div className="stack report-document">
        <section className="card">
          <h2>What your notes show</h2>
          {!report.metrics.length && (
            <p className="muted">Add sleep notes and check-ins to start seeing patterns.</p>
          )}
          {report.metrics
            .filter((m) => m.change !== 'none')
            .map((m) => (
              <div className="metric" key={m.label}>
                <div className="section-heading between">
                  <h3>{m.label}</h3>
                  <span className={`badge ${m.change}`}>
                    {
                      {
                        more: '↑ More',
                        less: '↓ Less',
                        same: 'About the same',
                        few: 'More notes needed',
                        flag: 'Worth mentioning',
                        none: 'Not recorded',
                      }[m.change]
                    }
                  </span>
                </div>
                {(['early', 'late'] as const).map((side) => {
                  const rate = (s: 'early' | 'late') =>
                    m.type === 'average'
                      ? m[s] || 0
                      : (m[s] || 0) / ((s === 'early' ? m.earlyN : m.lateN) || 1);
                  const max = Math.max(rate('early'), rate('late'), 0.001);
                  return (
                    <div className="metric-row" key={side}>
                      <span>
                        {side === 'early' ? 'First' : 'Last'}{' '}
                        {side === 'early' ? days - Math.floor(days / 2) : Math.floor(days / 2)} days
                      </span>
                      <div className="bar">
                        <span style={{ width: `${(rate(side) / max) * 100}%` }} className={side} />
                      </div>
                      <span>{metricValue(m, side)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          {report.metrics.some((m) => m.change === 'none') && (
            <details>
              <summary>No occurrences recorded</summary>
              <p className="muted">
                {report.metrics
                  .filter((m) => m.change === 'none')
                  .map((m) => m.label)
                  .join(' · ')}
              </p>
            </details>
          )}
        </section>
        {report.dozes > 0 && (
          <section className="card insight">
            <h2>Dozing and doses</h2>
            <p>
              <strong>
                {report.afterDose} of {report.dozes}
              </strong>{' '}
              daytime dozes came within 2 hours after a recorded dose.
            </p>
            <p className="muted">
              Timing alone cannot tell us why. It may be a useful question for the care team.
            </p>
          </section>
        )}
        <section className="card">
          <h2>Questions for the team</h2>
          <label className="sr-only" htmlFor="questions">
            Questions for the team
          </label>
          <textarea
            id="questions"
            value={questions}
            maxLength={50000}
            onChange={(e) => {
              setQuestions(e.target.value);
              setEdited(null);
            }}
            placeholder="One question per line…"
          />
          <button
            disabled={busy}
            className="button secondary"
            onClick={() => void save({ ...notebook, questions }, 'Questions recorded')}
          >
            Save questions
          </button>
        </section>
        <section className="card">
          <div className="section-heading between">
            <h2>Your visit note</h2>
            <span className="badge">Editable draft</span>
          </div>
          <label className="sr-only" htmlFor="report">
            Visit note
          </label>
          <textarea
            id="report"
            className="report-output"
            value={text}
            onChange={(e) => setEdited(e.target.value)}
          />
          <div className="button-row">
            <button className="button secondary" onClick={() => window.print()}>
              Print visit note
            </button>
            <button className="button primary" onClick={() => void copy()}>
              <Copy size={18} />
              Copy visit note
            </button>
            <button
              className="button secondary"
              onClick={() => download(`tendline-visit-${dayKey()}.txt`, text)}
            >
              <Download size={18} />
              Download text
            </button>
          </div>
          <p className="fine-print">
            Edits to this draft are included when you copy or download. Save questions above to keep
            them in your notebook.
          </p>
          {status && <p role="status">{status}</p>}
        </section>
      </div>
      <pre className="print-note">{text}</pre>
    </>
  );
}
