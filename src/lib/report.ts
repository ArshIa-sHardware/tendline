import {
  addDays,
  fmtDate,
  fmtTime,
  summarize,
  dayKey,
  entryDay,
  nameFor,
  type Notebook,
  type Entry,
  type NightEntry,
} from './model';
export interface Metric {
  label: string;
  type: 'average' | 'nights' | 'events';
  early: number | null;
  late: number | null;
  earlyN: number;
  lateN: number;
  change: 'more' | 'less' | 'same' | 'few' | 'flag' | 'none';
}
export function visitReport(n: Notebook, days: number, now = new Date()) {
  const start = dayKey(addDays(now, -(days - 1))),
    end = dayKey(now),
    mid = dayKey(addDays(now, -(Math.floor(days / 2) - 1)));
  const entries = n.entries.filter((e) => entryDay(e) >= start && entryDay(e) <= end);
  const nights = new Map<string, { pd?: NightEntry; cp?: NightEntry }>();
  entries.forEach((e) => {
    if (e.kind === 'night') nights.set(e.date, { ...nights.get(e.date), [e.who]: e });
  });
  const dayEntries = entries.filter((e) => e.kind !== 'night');
  const recordedDays = [...new Set(dayEntries.map(entryDay))];
  const metrics: Metric[] = [];
  type Night = { pd?: NightEntry; cp?: NightEntry };
  function add(
    label: string,
    type: Metric['type'],
    values: { date: string; value: number }[],
    flag = false,
  ) {
    const early = values.filter((x) => x.date < mid),
      late = values.filter((x) => x.date >= mid);
    const value = (xs: typeof values) =>
      xs.length ? xs.reduce((a, x) => a + x.value, 0) / (type === 'average' ? xs.length : 1) : null;
    const a = value(early),
      b = value(late);
    const difference =
      a == null || b == null
        ? null
        : type === 'average'
          ? b - a
          : b / late.length - a / early.length;
    let change: Metric['change'] =
      difference == null
        ? 'few'
        : Math.abs(difference) >= (type === 'average' ? 1 : 0.25) &&
            (type === 'average' || Math.max(a!, b!) >= 2)
          ? difference > 0
            ? 'more'
            : 'less'
          : 'same';
    if (type !== 'average' && (a || 0) + (b || 0) === 0) change = 'none';
    else if (flag && change !== 'more' && change !== 'less') change = 'flag';
    if (values.length)
      metrics.push({
        label,
        type,
        early: a,
        late: b,
        earlyN: early.length,
        lateN: late.length,
        change,
      });
  }
  function nightMetric(
    label: string,
    type: 'average' | 'nights',
    get: (night: Night) => number | boolean | null | undefined,
    flag = false,
  ) {
    const values: { date: string; value: number }[] = [];
    nights.forEach((night, date) => {
      const v = get(night);
      if (v != null) values.push({ date, value: Number(v) });
    });
    add(label, type, values, flag);
  }
  function eventMetric(label: string, test: (e: Entry) => boolean, flag = false) {
    add(
      label,
      'events',
      recordedDays.map((date) => ({
        date,
        value: dayEntries.filter((e) => entryDay(e) === date && test(e)).length,
      })),
      flag,
    );
  }
  nightMetric('Night wakings', 'average', (m) => m.pd?.data.wakes ?? m.cp?.data.wakes);
  nightMetric(
    'Bathroom trips at night',
    'average',
    (m) => m.pd?.data.bathroom ?? m.cp?.data.bathroom,
  );
  nightMetric('Took an hour or more to fall asleep', 'nights', (m) =>
    m.pd?.data.asleep ? m.pd.data.asleep === 'An hour or more' : null,
  );
  nightMetric('Woke tired or exhausted', 'nights', (m) =>
    m.pd?.data.rested ? ['Tired', 'Exhausted'].includes(m.pd.data.rested) : null,
  );
  nightMetric('Woke stiff or unable to turn over', 'nights', (m) =>
    m.pd?.data.reasons || m.cp?.data.reasons
      ? [m.pd, m.cp].some((x) => x?.data.reasons?.includes('Stiff, hard to turn over'))
      : null,
  );
  nightMetric('Care partner saw movement like acting out dreams', 'nights', (m) =>
    m.cp?.data.obs ? m.cp.data.obs.includes('Move or kick, like acting out a dream') : null,
  );
  nightMetric(
    'Care partner saw confusion at night',
    'nights',
    (m) => (m.cp?.data.obs ? m.cp.data.obs.includes('Seemed confused') : null),
    true,
  );
  nightMetric('Care partner had broken or very short sleep', 'nights', (m) =>
    m.cp?.data.own ? ['Broken sleep', 'I barely slept'].includes(m.cp.data.own) : null,
  );
  const doze = (e: Entry) =>
    e.kind === 'doze' || (e.kind === 'check' && e.data.energy === 'Dozed off');
  eventMetric('Dozed off during the day', doze);
  eventMetric('Froze', (e) => e.kind === 'check' && e.data.moving === 'Froze');
  eventMetric('Fell', (e) => e.kind === 'check' && e.data.moving === 'Fell', true);
  eventMetric(
    'Felt dizzy or nauseous',
    (e) =>
      e.kind === 'check' && Boolean(e.data.stomach?.some((s) => ['Dizzy', 'Nauseous'].includes(s))),
  );
  eventMetric(
    'Constipated',
    (e) => e.kind === 'check' && Boolean(e.data.stomach?.includes('Constipated')),
  );
  eventMetric(
    'Low or anxious mood',
    (e) => e.kind === 'check' && Boolean(e.data.mood?.some((s) => ['Low', 'Anxious'].includes(s))),
  );
  eventMetric(
    "Saw or heard things that weren't there",
    (e) =>
      e.kind === 'check' &&
      Boolean(e.data.mood?.includes("Saw or heard things that weren't there")),
    true,
  );
  const doses = dayEntries.filter((e) => e.kind === 'dose').map((e) => new Date(e.t).getTime());
  const dozes = dayEntries.filter(doze);
  const afterDose = dozes.filter((e) => {
    const t = new Date(e.t).getTime();
    return doses.some((d) => t >= d && t - d <= 7200000);
  }).length;
  const notes = entries
    .filter((e) => (e.kind === 'night' || e.kind === 'check') && e.data.note)
    .map((e) => ({ date: entryDay(e), who: e.who, note: 'data' in e ? e.data.note : '' }));
  return {
    start,
    end,
    mid,
    days,
    nights: nights.size,
    recordedDays: recordedDays.length,
    metrics,
    afterDose,
    dozes: dozes.length,
    notes,
    doses: doses.length,
  };
}
export function metricValue(m: Metric, side: 'early' | 'late') {
  const value = m[side],
    count = side === 'early' ? m.earlyN : m.lateN;
  if (value == null) return 'Not recorded';
  return m.type === 'average'
    ? `${Math.round(value * 10) / 10} / night (${count} nights)`
    : m.type === 'nights'
      ? `${value} of ${count} nights`
      : `${value} ${value === 1 ? 'time' : 'times'} / ${count} logged days`;
}
export function reportText(n: Notebook, r: ReturnType<typeof visitReport>) {
  const lines = [
    `HOME NOTES BEFORE OUR NEXT VISIT`,
    `${fmtDate(r.start)} to ${fmtDate(r.end)}`,
    `${r.nights} nights and ${r.recordedDays} days recorded by ${nameFor(n, 'pd')} and ${nameFor(n, 'cp')}.`,
    `First period: ${fmtDate(r.start)} to ${fmtDate(dayKey(addDays(new Date(r.mid + 'T12:00:00'), -1)))}. Last period: ${fmtDate(r.mid)} to ${fmtDate(r.end)}.`,
    '',
    'OBSERVATIONS',
  ];
  r.metrics.forEach((m) =>
    lines.push(
      `- ${m.label}: first ${metricValue(m, 'early')}; last ${metricValue(m, 'late')}. ${m.change === 'few' ? 'Not enough data to compare' : m.change === 'none' ? 'No occurrences recorded' : { more: 'More recorded', less: 'Less recorded', same: 'About the same', flag: 'Worth mentioning', few: 'More notes needed', none: 'No occurrences recorded' }[m.change]}.`,
    ),
  );
  if (r.dozes)
    lines.push(
      '',
      `DOZING AND DOSES: ${r.afterDose} of ${r.dozes} dozes came within 2 hours after a recorded dose. Timing alone does not show a cause.`,
    );
  const medicationRecords = n.entries.filter(
    (e) =>
      (e.kind === 'dose' || e.kind === 'lax') && entryDay(e) >= r.start && entryDay(e) <= r.end,
  );
  if (medicationRecords.length) {
    lines.push('', 'MEDICATION RECORDS');
    medicationRecords.forEach((e) => {
      if ('t' in e)
        lines.push(
          `- ${fmtDate(entryDay(e))} ${fmtTime(e.t)}: ${summarize(e)}. Recorded by ${nameFor(n, e.who)}.`,
        );
    });
  }
  for (const who of ['pd', 'cp'] as const) {
    lines.push('', `IN ${nameFor(n, who).toUpperCase()}'S WORDS`);
    r.notes
      .filter((x) => x.who === who)
      .forEach((x) => lines.push(`- ${fmtDate(x.date)}: ${x.note}`));
  }
  lines.push(
    '',
    'OUR QUESTIONS',
    n.questions || 'No questions added.',
    '',
    'These are home observations, not a medical assessment. Missing entries do not mean symptoms were absent.',
  );
  return lines.join('\n');
}
