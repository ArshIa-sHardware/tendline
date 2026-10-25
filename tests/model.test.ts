import { describe, expect, it } from 'vitest';
import { atTime, freshState, notebookSchema, parseBackup, type Notebook } from '../src/lib/model';
import { exampleState } from '../src/lib/example';
import { csvCell, csvText } from '../src/lib/export';
import { visitReport, reportText } from '../src/lib/report';

describe('legacy compatibility and validation', () => {
  it('preserves all tracking entries in a legacy backup', () => {
    const n = exampleState();
    const restored = parseBackup({ format: 'bedside-notebook-backup', version: 2, notebook: n });
    expect(restored.entries).toEqual(n.entries);
    expect(restored.names).toEqual(n.names);
    expect(restored.questions).toEqual(n.questions);
    expect(restored.example).toBe(false);
    expect(new Set(restored.entries.map((e) => e.kind))).toEqual(
      new Set(['night', 'check', 'dose', 'doze', 'bm', 'lax']),
    );
  });
  it('fills defaults on compatible old raw notebooks', () => {
    expect(parseBackup({ entries: [], names: {}, show: {} }).show.meds).toBe(true);
  });
  it.each([
    { id: 'x', kind: 'night', who: 'pd', date: '2026-02-31', data: {} },
    { id: 'x', kind: 'night', who: 'pd', date: '2026-10-25', data: { reasons: 'Bathroom' } },
    { id: 'x', kind: 'night', who: 'pd', date: '2026-10-25', data: { bed: '25:12' } },
    { id: 'x', kind: 'check', who: 'cp', t: '2026-10-25T10:00:00Z' },
    { id: 'x', kind: 'dose', who: 'stranger', t: '2026-10-25T10:00:00Z' },
  ])('rejects malformed entry %#', (entry) =>
    expect(() => parseBackup({ ...freshState(), entries: [entry] })).toThrow(),
  );
  it('rejects duplicate IDs and duplicate nights', () => {
    const entry = { id: 'one', kind: 'night', who: 'pd', date: '2026-10-25', data: {} };
    expect(
      notebookSchema.safeParse({ ...freshState(), entries: [entry, { ...entry, id: 'two' }] })
        .success,
    ).toBe(false);
  });
  it('blocks impossible and future timestamps at entry time', () => {
    expect(() => atTime('2026-02-31', '09:00')).toThrow();
    expect(() => atTime('2099-01-01', '09:00')).toThrow();
    expect(() => atTime('2025-01-01', '')).toThrow();
    expect(atTime('2025-01-01', '09:00')).toMatch(/^2025-01-01T/);
  });
  it('escapes spreadsheet formulas including leading whitespace', () => {
    expect(csvCell(' =HYPERLINK("bad")')).toBe('"\' =HYPERLINK(""bad"")"');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvText(exampleState())).toContain('Bathroom');
  });
});

describe('visit summaries', () => {
  it('uses patient counts first, preserves partner observations, ignores missing answers', () => {
    const n: Notebook = {
      ...freshState(),
      entries: [
        { id: 'a', kind: 'night', who: 'pd', date: '2026-10-15', data: { wakes: 2 } },
        {
          id: 'b',
          kind: 'night',
          who: 'cp',
          date: '2026-10-15',
          data: { wakes: 8, note: 'Partner observation' },
        },
        { id: 'c', kind: 'night', who: 'pd', date: '2026-10-24', data: { wakes: 5 } },
      ],
    };
    const r = visitReport(n, 14, new Date('2026-10-25T12:00:00'));
    expect(r.metrics.find((m) => m.label === 'Night wakings')).toMatchObject({
      early: 2,
      late: 5,
      change: 'more',
    });
    expect(r.metrics.some((m) => m.label === 'Woke tired or exhausted')).toBe(false);
    expect(reportText(n, r)).toContain('Partner observation');
  });
  it('flags a single fall and counts dozing timing without double-counting doses', () => {
    const n: Notebook = {
      ...freshState(),
      entries: [
        { id: 'a', kind: 'dose', who: 'pd', t: '2026-10-24T10:00:00Z' },
        { id: 'b', kind: 'dose', who: 'pd', t: '2026-10-24T10:30:00Z' },
        { id: 'c', kind: 'doze', who: 'cp', t: '2026-10-24T11:00:00Z' },
        { id: 'd', kind: 'check', who: 'pd', t: '2026-10-24T12:00:00Z', data: { moving: 'Fell' } },
      ],
    };
    const r = visitReport(n, 14, new Date('2026-10-25T12:00:00'));
    expect(r.afterDose).toBe(1);
    expect(r.metrics.find((m) => m.label === 'Fell')?.change).toBe('flag');
  });
});
