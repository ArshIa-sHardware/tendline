import { useEffect, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import {
  dayKey,
  parseKey,
  fmtDay,
  appointmentSchema,
  type Appointment,
  type Notebook,
} from '../lib/model';
export function NotebookCalendar({
  notebook,
  selected,
  onSelect,
}: {
  notebook: Notebook;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(parseKey(selected));
  useEffect(() => setMonth(parseKey(selected)), [selected]);
  return (
    <DayPicker
      month={month}
      onMonthChange={setMonth}
      mode="single"
      required
      selected={parseKey(selected)}
      onSelect={(d) => {
        if (d) onSelect(dayKey(d));
      }}
      showOutsideDays
      modifiers={{ appointment: notebook.appointments.map((a) => parseKey(a.date)) }}
      modifiersClassNames={{ appointment: 'has-appointment' }}
      footer="Underlined dates have appointments."
    />
  );
}
export function Appointments({
  notebook,
  save,
  busy,
}: {
  notebook: Notebook;
  save: (n: Notebook, message: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(dayKey());
  const [draft, setDraft] = useState<Appointment | null>(null);
  const [error, setError] = useState('');
  const dayAppointments = notebook.appointments
    .filter((a) => a.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = notebook.appointments
    .filter((a) => a.date >= dayKey())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 6);
  function add() {
    setError('');
    setDraft({
      id: crypto.randomUUID(),
      title: '',
      date: selected,
      time: '',
      location: '',
      notes: '',
    });
  }
  return (
    <>
      <div className="page-heading">
        <h1>Appointments</h1>
        <p>A calendar for visits, and a place to keep what you want to ask.</p>
      </div>
      <div className="calendar-layout">
        <aside className="calendar-rail">
          <NotebookCalendar
            notebook={notebook}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
            }}
          />
          <h2>Coming up</h2>
          {upcoming.length ? (
            upcoming.map((a) => (
              <button
                className="upcoming-row"
                key={a.id}
                onClick={() => {
                  setSelected(a.date);
                  setDraft(a);
                }}
              >
                <strong>{a.title}</strong>
                <span>
                  {fmtDay(a.date)}
                  {a.time && ` · ${a.time}`}
                </span>
              </button>
            ))
          ) : (
            <p className="muted">No upcoming appointments.</p>
          )}
        </aside>
        <section className="appointment-page">
          <div className="section-heading between">
            <h2>{fmtDay(selected)}</h2>
            <button className="button primary" disabled={busy} onClick={add}>
              Add appointment
            </button>
          </div>
          {dayAppointments.length ? (
            dayAppointments.map((a) => (
              <article className="appointment-entry" key={a.id}>
                <span className="appointment-time">{a.time || 'Time to be arranged'}</span>
                <h3>{a.title}</h3>
                {a.location && <p>{a.location}</p>}
                {a.notes && <p className="appointment-notes">{a.notes}</p>}
                <div className="button-row">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setDraft(a);
                    }}
                  >
                    Edit appointment
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete ${a.title}?`))
                        void save(
                          {
                            ...notebook,
                            appointments: notebook.appointments.filter((x) => x.id !== a.id),
                          },
                          'Appointment deleted',
                        );
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-day">Nothing planned for this day.</p>
          )}
          {draft && (
            <form
              className="appointment-form stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                const result = appointmentSchema.safeParse(draft);
                if (!result.success) {
                  setError('Check the title, date and time.');
                  return;
                }
                if (
                  await save(
                    {
                      ...notebook,
                      appointments: [
                        ...notebook.appointments.filter((a) => a.id !== draft.id),
                        result.data,
                      ],
                    },
                    'Appointment saved',
                  )
                ) {
                  setSelected(draft.date);
                  setDraft(null);
                }
              }}
            >
              <h2>
                {notebook.appointments.some((a) => a.id === draft.id)
                  ? 'Edit appointment'
                  : 'New appointment'}
              </h2>
              <label>
                Appointment name
                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="For example, neurology visit"
                />
              </label>
              <div className="row-two">
                <label>
                  Date
                  <input
                    required
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </label>
                <label>
                  Time (optional)
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Where (optional)
                <input
                  maxLength={500}
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </label>
              <label>
                Bring or ask (optional)
                <textarea
                  maxLength={5000}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Questions, directions, or things to bring"
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button className="button primary" disabled={busy}>
                  Save appointment
                </button>
                <button type="button" className="button secondary" onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
