import { freshState, addDays, dayKey, pad, type Notebook } from './model';
const uid = () => crypto.randomUUID();
export function exampleState(): Notebook {
  const s = freshState();
  s.example = true;
  s.started = true;
  s.appointments = [
    {
      id: uid(),
      title: 'Neurology visit',
      date: dayKey(addDays(new Date(), 3)),
      time: '10:30',
      location: 'Example clinic',
      notes: 'Bring medication list. Ask about waking at night.',
    },
  ];
  s.names = { pd: 'Walt', cp: 'June' };
  s.questions =
    'Is the afternoon dozing linked to the midday dose?\nWhat can we do about waking up stiff around 3 AM?';
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doses = [
    [7, 30],
    [11, 30],
    [15, 30],
    [19, 30],
  ];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    const k = dayKey(d);
    const late = i < 7; // last 7 days are rougher
    // night (morning of d)
    const wakes = late ? 3 + Math.round(rnd() * 1.4) : 1 + Math.round(rnd() * 1.2);
    const bath = late ? 2 + Math.round(rnd()) : 1 + Math.round(rnd() * 0.8);
    s.entries.push({
      id: uid(),
      kind: 'night',
      who: 'pd',
      date: k,
      data: {
        bed: '22:' + pad(15 + Math.round(rnd() * 30)),
        up: '0' + (6 + Math.round(rnd())) + ':' + pad(Math.round(rnd() * 4) * 10),
        asleep:
          late && rnd() > 0.4 ? 'An hour or more' : rnd() > 0.5 ? 'About half an hour' : 'Quickly',
        wakes,
        bathroom: bath,
        reasons: ['Bathroom']
          .concat(late ? ['Stiff, hard to turn over'] : [])
          .concat(rnd() > 0.7 ? ['Vivid dreams'] : []),
        rested: late ? (rnd() > 0.5 ? 'Tired' : 'Exhausted') : rnd() > 0.6 ? 'Okay' : 'Rested',
        note: '',
      },
    });
    if (i !== 3 && i !== 9)
      s.entries.push({
        id: uid(),
        kind: 'night',
        who: 'cp',
        date: k,
        data: {
          wakes: wakes + (rnd() > 0.6 ? 1 : 0),
          bathroom: bath,
          obs:
            late && rnd() > 0.45
              ? ['Move or kick, like acting out a dream', 'Talk or shout in sleep']
              : rnd() > 0.8
                ? ['Talk or shout in sleep']
                : [],
          own: late
            ? rnd() > 0.4
              ? 'Broken sleep'
              : 'I barely slept'
            : rnd() > 0.5
              ? 'I slept well'
              : 'Broken sleep',
          note: i === 2 ? "Kicked hard around 2 AM. He didn't remember it in the morning." : '',
        },
      });
    if (i === 0) continue; // today: only morning so far
    for (const [hh, mm] of doses) {
      const t = new Date(d);
      t.setHours(hh, mm + Math.round(rnd() * 20));
      s.entries.push({
        id: uid(),
        kind: 'dose',
        who: rnd() > 0.5 ? 'pd' : 'cp',
        t: t.toISOString(),
      });
    }
    // dozing: more often in late week, after the 11:30 dose
    if (late ? rnd() > 0.15 : rnd() > 0.7) {
      const t = new Date(d);
      t.setHours(12, 40 + Math.round(rnd() * 30));
      s.entries.push({ id: uid(), kind: 'doze', who: 'cp', t: t.toISOString() });
    }
    if (late && rnd() > 0.5) {
      const t = new Date(d);
      t.setHours(16, 30 + Math.round(rnd() * 20));
      s.entries.push({ id: uid(), kind: 'doze', who: 'pd', t: t.toISOString() });
    }
    // check-ins
    const c1 = new Date(d);
    c1.setHours(10, 50 + Math.round(rnd() * 15));
    s.entries.push({
      id: uid(),
      kind: 'check',
      who: 'pd',
      t: c1.toISOString(),
      data: {
        meds: 'Wearing off',
        moving: late && rnd() > 0.5 ? 'Froze' : 'Slow or stiff',
        energy: 'Alert',
        stomach: ['Fine'],
        mood: ['Steady'],
        food: '',
      },
    });
    const c2 = new Date(d);
    c2.setHours(14, 10 + Math.round(rnd() * 20));
    s.entries.push({
      id: uid(),
      kind: 'check',
      who: 'cp',
      t: c2.toISOString(),
      data: {
        meds: 'Doing well on it',
        moving: 'Moving well',
        energy: late ? 'Tired' : 'Alert',
        stomach: rnd() > 0.6 ? ['Constipated'] : ['Fine'],
        mood: late && rnd() > 0.5 ? ['Low'] : ['Steady'],
        food: 'Just ate',
      },
    });
    if (rnd() > 0.55) {
      const t = new Date(d);
      t.setHours(9, 0);
      s.entries.push({ id: uid(), kind: 'bm', who: 'pd', t: t.toISOString() });
    }
    if (i % 3 === 0) {
      const t = new Date(d);
      t.setHours(20, 15);
      s.entries.push({ id: uid(), kind: 'lax', who: 'cp', t: t.toISOString() });
    }
    if (late && i === 4) {
      const t = new Date(d);
      t.setHours(18, 50);
      s.entries.push({
        id: uid(),
        kind: 'check',
        who: 'cp',
        t: t.toISOString(),
        data: {
          meds: 'Wearing off',
          moving: 'Fell',
          energy: 'Tired',
          stomach: ['Dizzy'],
          mood: ['Anxious'],
          food: '',
        },
      });
    }
  }
  return s;
}
