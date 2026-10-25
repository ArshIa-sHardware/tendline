import { z } from 'zod';

export const Q = {
  asleep: {
    label: 'How long did it take to fall asleep?',
    opts: ['Quickly', 'About half an hour', 'An hour or more', 'Not sure'],
  },
  reasons: {
    label: 'What woke you or kept you up?',
    partnerLabel: 'What seemed to wake them or keep them up?',
    multi: true,
    opts: [
      'Bathroom',
      'Stiff, hard to turn over',
      'Pain or cramps',
      'Restless legs',
      'Vivid dreams',
      'Too hot or sweaty',
      'Worry, racing thoughts',
      'Not sure',
    ],
  },
  rested: {
    label: 'How do you feel this morning?',
    opts: ['Rested', 'Okay', 'Tired', 'Exhausted'],
  },
  obs: {
    label: 'During the night, did you notice them…',
    multi: true,
    opts: [
      'Talk or shout in sleep',
      'Move or kick, like acting out a dream',
      'Seemed confused',
      'Get up and wander',
      'Loud snoring or breathing pauses',
      'Fell',
    ],
  },
  own: { label: 'And your own sleep?', opts: ['I slept well', 'Broken sleep', 'I barely slept'] },
  meds: {
    label: 'Symptoms around a dose',
    opts: [
      'Before my dose',
      'Within an hour after',
      'Doing well on it',
      'Wearing off',
      'No dose today',
    ],
  },
  moving: { label: 'Moving', opts: ['Moving well', 'Slow or stiff', 'Shuffling', 'Froze', 'Fell'] },
  energy: { label: 'Energy', opts: ['Alert', 'Tired', 'Dozed off'] },
  stomach: {
    label: 'Stomach',
    multi: true,
    opts: ['Fine', 'Nauseous', 'Stomach ache', 'Dizzy', 'Constipated'],
  },
  mood: {
    label: 'Mood',
    multi: true,
    opts: ['Steady', 'Low', 'Anxious', 'Irritable', "Saw or heard things that weren't there"],
  },
  food: { label: 'Food', opts: ['Just ate', 'Ate a lot of protein', "Haven't eaten in a while"] },
} as const;
export type QuestionKey = keyof typeof Q;
export type Who = 'pd' | 'cp';
export const SHOW_LABELS = {
  asleep: 'Falling asleep',
  wakes: 'Times woken up',
  bathroom: 'Bathroom trips at night',
  reasons: 'What woke them',
  rested: 'How rested in the morning',
  obs: 'Care partner: what I saw',
  own: 'Care partner: my sleep',
  meds: 'Symptoms around a dose',
  moving: 'Moving',
  energy: 'Energy and dozing',
  stomach: 'Stomach',
  mood: 'Mood',
  food: 'Food',
};
export const KIND_LABEL = {
  night: 'Sleep note',
  check: 'Symptom check-in',
  dose: 'Took a dose',
  doze: 'Dozed off',
  bm: 'Bowel movement',
  lax: 'Took a laxative',
};
export const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (s: string) => new Date(`${s}T12:00:00`);
export const addDays = (d: Date, n: number) => {
  const v = new Date(d);
  v.setDate(v.getDate() + n);
  return v;
};
export const timeVal = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
};
export const fmtClock = (s: string) =>
  s
    ? new Date(`2000-01-01T${s}:00`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
export const fmtDay = (s: string) =>
  parseKey(s).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
export const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => dayKey(parseKey(s)) === s, 'Choose a real calendar date');
const timeSchema = z.union([z.literal(''), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]);
const choice = (k: QuestionKey) =>
  z
    .string()
    .refine((v) => v === '' || (Q[k].opts as readonly string[]).includes(v), 'Unknown answer');
const multiple = (k: QuestionKey) => z.array(choice(k)).max(Q[k].opts.length);
export const dataSchema = z.object({
  bed: timeSchema.optional(),
  up: timeSchema.optional(),
  wakes: z.number().int().min(0).max(999).nullable().optional(),
  bathroom: z.number().int().min(0).max(999).nullable().optional(),
  asleep: choice('asleep').optional(),
  reasons: multiple('reasons').optional(),
  rested: choice('rested').optional(),
  obs: multiple('obs').optional(),
  own: choice('own').optional(),
  meds: choice('meds').optional(),
  moving: choice('moving').optional(),
  energy: choice('energy').optional(),
  stomach: multiple('stomach').optional(),
  mood: multiple('mood').optional(),
  food: choice('food').optional(),
  medicineContext: z.string().max(200).optional(),
  note: z.string().max(50000).optional(),
});
const common = { id: z.string().min(1).max(128), who: z.enum(['pd', 'cp']) };
export const medicationDetailsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  strength: z.string().trim().max(100).optional(),
  amount: z.string().trim().min(1).max(100),
  note: z.string().max(1000).optional(),
});
export const entrySchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('night'), date: dateSchema, data: dataSchema }),
  z.object({
    ...common,
    kind: z.literal('check'),
    t: z.iso.datetime({ offset: true }),
    data: dataSchema,
  }),
  z.object({
    ...common,
    kind: z.enum(['dose', 'doze', 'bm', 'lax']),
    medication: medicationDetailsSchema.optional(),
    t: z.iso.datetime({ offset: true }),
  }),
]);
export const appointmentSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  date: dateSchema,
  time: timeSchema,
  location: z.string().max(500),
  notes: z.string().max(5000),
});
export type Appointment = z.infer<typeof appointmentSchema>;
export function nearbyDose(entries: Entry[], t: string, medicine?: string) {
  return entries.some(
    (e) =>
      (e.kind === 'dose' || e.kind === 'lax') &&
      (!medicine ||
        !e.medication ||
        e.medication.name.toLocaleLowerCase() === medicine.trim().toLocaleLowerCase()) &&
      Math.abs(Date.parse(e.t) - Date.parse(t)) < 600000,
  );
}
export const notebookSchema = z
  .object({
    v: z.literal(1).default(1),
    names: z.object({ pd: z.string().max(200).default(''), cp: z.string().max(200).default('') }),
    show: z.record(z.string(), z.boolean()),
    entries: z.array(entrySchema).max(50000),
    appointments: z.array(appointmentSchema).max(5000).default([]),
    questions: z.string().max(50000).default(''),
    larger: z.boolean().default(false),
    textScale: z.union([z.literal(100), z.literal(125), z.literal(150), z.literal(200)]).optional(),
    example: z.boolean().default(false),
    started: z.boolean().default(true),
    notes: z.boolean().default(false),
  })
  .superRefine((n, ctx) => {
    const appointmentIds = new Set<string>();
    n.appointments.forEach((a, i) => {
      if (appointmentIds.has(a.id))
        ctx.addIssue({
          code: 'custom',
          path: ['appointments', i],
          message: 'Duplicate appointment',
        });
      appointmentIds.add(a.id);
    });
    const ids = new Set<string>(),
      nights = new Set<string>();
    n.entries.forEach((e, i) => {
      const key = e.kind === 'night' ? `${e.date}:${e.who}` : null;
      if (ids.has(e.id) || (key && nights.has(key)))
        ctx.addIssue({
          code: 'custom',
          path: ['entries', i],
          message: 'Duplicate entry or sleep note',
        });
      ids.add(e.id);
      if (key) nights.add(key);
    });
  });
export type Entry = z.infer<typeof entrySchema>;
export type NightEntry = Extract<Entry, { kind: 'night' }>;
export type EntryData = z.infer<typeof dataSchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export const freshState = (): Notebook => ({
  v: 1,
  names: { pd: '', cp: '' },
  show: Object.fromEntries(Object.keys(SHOW_LABELS).map((k) => [k, true])),
  entries: [],
  appointments: [],
  questions: '',
  larger: false,
  example: false,
  started: true,
  notes: false,
});
export const nameFor = (n: Notebook, who: Who) =>
  n.names[who].trim() || (who === 'pd' ? 'Me' : 'Care partner');
export const entryDay = (e: Entry) => (e.kind === 'night' ? e.date : dayKey(new Date(e.t)));
export function atTime(date: string, time: string): string {
  dateSchema.parse(date);
  timeSchema.parse(time);
  if (!time) throw new Error('Choose a time.');
  const d = new Date(`${date}T${time}:00`);
  if (dayKey(d) !== date || timeVal(d) !== time)
    throw new Error('That time does not exist on this date. Choose another time.');
  if (d.getTime() > Date.now() + 60000) throw new Error('Choose a time that has already happened.');
  return d.toISOString();
}
export function parseBackup(input: unknown): Notebook {
  const envelope = z
    .object({
      format: z.literal('bedside-notebook-backup'),
      version: z.union([z.literal(2), z.literal(4)]),
      notebook: z.unknown(),
    })
    .safeParse(input);
  const raw = envelope.success ? envelope.data.notebook : input;
  const n = notebookSchema.parse(raw);
  return { ...n, example: false, started: true, show: { ...freshState().show, ...n.show } };
}
export function summarize(e: Entry): string {
  if (e.kind !== 'night' && e.kind !== 'check')
    return e.medication
      ? `${e.medication.name}${e.medication.strength ? ` (${e.medication.strength})` : ''} · ${e.medication.amount}${e.medication.note ? ` · ${e.medication.note}` : ''}`
      : e.kind === 'dose' || e.kind === 'lax'
        ? `${KIND_LABEL[e.kind]} · medicine not specified`
        : KIND_LABEL[e.kind];
  const d = e.data,
    parts: string[] = [];
  if (e.kind === 'night') {
    if (d.bed) parts.push(`Bed ${d.bed}`);
    if (d.up) parts.push(`Up ${d.up}`);
    if (d.wakes != null) parts.push(`Woke ${d.wakes}×`);
    if (d.bathroom != null) parts.push(`${d.bathroom} bathroom trips`);
  }
  const keys: QuestionKey[] =
    e.kind === 'night'
      ? ['asleep', 'reasons', 'rested', 'obs', 'own']
      : ['meds', 'moving', 'energy', 'stomach', 'mood', 'food'];
  keys.forEach((k) => {
    const v = d[k];
    if (Array.isArray(v) ? v.length : v) parts.push(Array.isArray(v) ? v.join(', ') : String(v));
  });
  if (d.medicineContext) parts.push(`Medicine context: ${d.medicineContext}`);
  if (d.note) parts.push(`“${d.note}”`);
  return parts.join(' · ') || 'No details recorded';
}
