import { BedSingle, Pill, ClipboardPen } from 'lucide-react';
import type { View } from './Workspace';
export const recordChoices = [
  {
    id: 'sleep' as const,
    label: 'Sleep',
    description: 'Bedtime, waking, and how the night felt',
    Icon: BedSingle,
  },
  {
    id: 'check' as const,
    label: 'Symptoms',
    description: 'How you feel and what you noticed',
    Icon: ClipboardPen,
  },
  {
    id: 'medication' as const,
    label: 'Medication',
    description: 'Medicine, amount taken, and time',
    Icon: Pill,
  },
];
export function RecordNav({ view, go }: { view: View; go: (v: View) => void }) {
  return (
    <nav className="record-nav" aria-label="Record type">
      {recordChoices.map(({ id, label, Icon }) => (
        <button
          key={id}
          aria-current={
            view === id || (view === 'laxative' && id === 'medication') ? 'page' : undefined
          }
          onClick={() => go(id)}
        >
          <Icon size={22} />
          <span>Log {label.toLowerCase()}</span>
        </button>
      ))}
    </nav>
  );
}
export function RecordStart({ go }: { go: (v: View) => void }) {
  return (
    <>
      <header className="page-heading">
        <h1>What would you like to record?</h1>
        <p>Choose a record. You can add another afterward.</p>
      </header>
      <div className="record-choices">
        {recordChoices.map(({ id, label, description, Icon }) => (
          <button key={id} onClick={() => go(id)}>
            <Icon size={28} />
            <span>
              <strong>{label}</strong>
              <span>{description}</span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </>
  );
}
