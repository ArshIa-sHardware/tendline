// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Appointments } from '../src/features/Appointments';
import { Question } from '../src/components/Fields';
import {
  appointmentSchema,
  dayKey,
  freshState,
  notebookSchema,
  nearbyDose,
  parseBackup,
} from '../src/lib/model';
afterEach(cleanup);
it('imports older notebooks without appointments and round-trips new appointments', () => {
  const { appointments: _, ...legacy } = freshState();
  expect(parseBackup(legacy).appointments).toEqual([]);
  const appointment = {
    id: 'a',
    title: 'Visit',
    date: '2026-11-01',
    time: '09:30',
    location: 'Clinic',
    notes: 'Bring notebook',
  };
  expect(parseBackup({ ...legacy, appointments: [appointment] }).appointments).toEqual([
    appointment,
  ]);
  expect(appointmentSchema.safeParse({ ...appointment, date: '2026-02-30' }).success).toBe(false);
  expect(appointmentSchema.safeParse({ ...appointment, title: '   ' }).success).toBe(false);
  expect(
    notebookSchema.safeParse({ ...legacy, appointments: [{ ...appointment, time: '25:00' }] })
      .success,
  ).toBe(false);
});
it('detects recent dose across both perspectives', () => {
  const entries = [
    { id: 'dose', kind: 'dose' as const, who: 'cp' as const, t: '2026-10-25T12:00:00Z' },
  ];
  expect(nearbyDose(entries, '2026-10-25T12:09:00Z')).toBe(true);
  expect(nearbyDose(entries, '2026-10-25T12:10:00Z')).toBe(false);
});
it('saves appointment fields without changing diary entries', async () => {
  const notebook = freshState(),
    save = vi.fn().mockResolvedValue(true);
  render(<Appointments notebook={notebook} save={save} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add appointment' }));
  fireEvent.change(screen.getByLabelText('Appointment name'), {
    target: { value: 'Neurology visit' },
  });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-04' } });
  fireEvent.change(screen.getByLabelText('Bring or ask (optional)'), {
    target: { value: 'Bring questions' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save appointment' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].appointments[0]).toMatchObject({
    title: 'Neurology visit',
    date: '2026-11-04',
    notes: 'Bring questions',
  });
  expect(save.mock.calls[0][0].entries).toEqual(notebook.entries);
});
it('edits existing appointments without duplicating them', async () => {
  const notebook = freshState();
  notebook.appointments = [
    { id: 'a', title: 'Old title', date: dayKey(), time: '', location: '', notes: '' },
  ];
  const save = vi.fn().mockResolvedValue(true);
  render(<Appointments notebook={notebook} save={save} busy={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit appointment' }));
  fireEvent.change(screen.getByLabelText('Appointment name'), { target: { value: 'New title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save appointment' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].appointments).toHaveLength(1);
  expect(save.mock.calls[0][0].appointments[0]).toMatchObject({ id: 'a', title: 'New title' });
});
it('uses native radio and checkbox controls with full labels', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <Question id="energy" data={{ energy: 'Alert' }} onChange={onChange} />,
  );
  fireEvent.click(screen.getByRole('radio', { name: 'Tired' }));
  expect(onChange).toHaveBeenLastCalledWith({ energy: 'Tired' });
  rerender(<Question id="mood" data={{ mood: ['Low'] }} onChange={onChange} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Anxious' }));
  expect(onChange).toHaveBeenLastCalledWith({ mood: ['Low', 'Anxious'] });
});
