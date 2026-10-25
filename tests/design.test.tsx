// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { EntrySummary } from '../src/components/EntrySummary';
import { IdentitySwitch } from '../src/components/Identity';
import { Notebook } from '../src/features/Notebook';
import { freshState, parseBackup, type Entry } from '../src/lib/model';
afterEach(cleanup);
const night: Entry = {
  id: 'sleep',
  who: 'pd',
  kind: 'night',
  date: '2026-10-25',
  data: {
    bed: '22:45',
    up: '07:30',
    wakes: 0,
    bathroom: 2,
    rested: 'Tired',
    note: 'A quieter night.',
  },
};
it('renders zero counts, labels and narrative as distinct structured data', () => {
  const { container } = render(<EntrySummary entry={night} />);
  expect(screen.getByText('Awakenings').nextElementSibling?.textContent).toBe('0');
  expect(screen.getByText('Bedtime').nextElementSibling?.textContent).toBe('10:45 PM');
  expect(container.querySelector('.narrative')?.textContent).toContain('A quieter night.');
  expect(container.querySelectorAll('dt').length).toBe(5);
});
it('marks freezing and falls explicitly without inferring them from narrative', () => {
  const { rerender } = render(
    <EntrySummary
      entry={{
        id: 'c',
        who: 'cp',
        kind: 'check',
        t: '2026-10-25T10:00:00Z',
        data: { moving: 'Froze' },
      }}
    />,
  );
  expect(screen.getByText('Freezing episode recorded')).toBeTruthy();
  rerender(<EntrySummary entry={{ ...night, data: { note: 'No fall today.' } }} />);
  expect(screen.queryByText('Fall recorded')).toBeNull();
});
it('switches author through a keyboard-accessible labeled native selector', () => {
  const n = freshState();
  n.names = { pd: 'Walt', cp: 'June' };
  const onChange = vi.fn();
  render(<IdentitySwitch notebook={n} who="pd" onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Who is writing' }), {
    target: { value: 'cp' },
  });
  expect(onChange).toHaveBeenCalledWith('cp');
});
it('keeps conflicting patient and caregiver measurements separately attributed', () => {
  const n = freshState();
  n.names = { pd: 'Walt', cp: 'June' };
  n.entries = [night, { ...night, id: 'partner', who: 'cp', data: { wakes: 4 } }];
  const { container } = render(<Notebook notebook={n} save={vi.fn()} busy={false} />);
  const pd = container.querySelector('.perspective-pd')!,
    cp = container.querySelector('.perspective-cp')!;
  expect(within(pd as HTMLElement).getByText('Walt')).toBeTruthy();
  expect(within(cp as HTMLElement).getByText('June')).toBeTruthy();
  expect(within(pd as HTMLElement).getByText('Awakenings').nextElementSibling?.textContent).toBe(
    '0',
  );
  expect(within(cp as HTMLElement).getByText('Awakenings').nextElementSibling?.textContent).toBe(
    '4',
  );
});
it('retains legacy enlarged text and validates new enlargement preferences', () => {
  expect(parseBackup({ ...freshState(), larger: true }).larger).toBe(true);
  expect(parseBackup({ ...freshState(), textScale: 200 }).textScale).toBe(200);
  expect(() => parseBackup({ ...freshState(), textScale: 999 })).toThrow();
});
