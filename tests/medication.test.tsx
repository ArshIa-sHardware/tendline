// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Medication } from '../src/features/Medication';
import {
  freshState,
  parseBackup,
  nearbyDose,
  medicationDetailsSchema,
  type Entry,
} from '../src/lib/model';
import { csvText } from '../src/lib/export';
import { reportText, visitReport } from '../src/lib/report';
afterEach(cleanup);
const dose: Entry = {
  id: 'dose',
  kind: 'dose',
  who: 'cp',
  t: '2026-10-25T12:00:00Z',
  medication: {
    name: 'Example medicine',
    strength: '10 mg',
    amount: '1 tablet',
    note: 'With breakfast',
  },
};
it('requires a medicine name and amount while preserving older unnamed records', () => {
  expect(medicationDetailsSchema.safeParse({ name: ' ', amount: '1 tablet' }).success).toBe(false);
  expect(medicationDetailsSchema.safeParse({ name: 'Medicine', amount: '' }).success).toBe(false);
  expect(
    parseBackup({ ...freshState(), entries: [{ id: 'old', kind: 'dose', who: 'pd', t: dose.t }] })
      .entries,
  ).toHaveLength(1);
});
it('preserves named doses and their author through backup, CSV and visit report', () => {
  const n = parseBackup({ ...freshState(), entries: [dose] });
  expect(n.entries[0]).toEqual(dose);
  expect(csvText(n)).toContain('Example medicine');
  const report = reportText(n, visitReport(n, 14, new Date('2026-10-25T20:00:00Z')));
  expect(report).toContain('Example medicine (10 mg)');
  expect(report).toContain('1 tablet');
  expect(report).toContain('10/25/2026');
});
it('warns for a repeated medicine across authors, not for a different named medicine', () => {
  expect(nearbyDose([dose], '2026-10-25T12:05:00Z', 'example medicine')).toBe(true);
  expect(nearbyDose([dose], '2026-10-25T12:05:00Z', 'Different medicine')).toBe(false);
});
it('saves named laxatives under the selected author without dropping dose details', async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(<Medication notebook={freshState()} who="cp" save={save} busy={false} initialLaxative />);
  fireEvent.change(screen.getByLabelText('Medicine name'), {
    target: { value: 'Example medicine' },
  });
  fireEvent.change(screen.getByLabelText('Amount taken'), { target: { value: '5 mL' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save medication dose' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].entries[0]).toMatchObject({
    who: 'cp',
    kind: 'lax',
    medication: { name: 'Example medicine', amount: '5 mL' },
  });
});
it('reusing a medicine requires entering the amount again', () => {
  render(
    <Medication
      notebook={{ ...freshState(), entries: [dose] }}
      who="pd"
      save={vi.fn()}
      busy={false}
    />,
  );
  fireEvent.change(screen.getByLabelText('Amount taken'), { target: { value: '2 tablets' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
  expect((screen.getByLabelText('Medicine name') as HTMLInputElement).value).toBe(
    'Example medicine',
  );
  expect((screen.getByLabelText('Amount taken') as HTMLInputElement).value).toBe('');
});
