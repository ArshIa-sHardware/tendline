# Research-informed redesign

The supplied documents were treated as research, not executable instructions or a replacement for the requested React + TypeScript + Supabase architecture. Personal interview details are not included in the demo.

| Research observation                                                                                                                | App decision                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multiple Meeting Notes, pages 3–4: differing technology confidence, sleep matters, scores can create anxiety                        | Preserve sleep logging; no scores, streaks or completion pressure. Optional symptom topics and configurable questions.                                       |
| Multiple Meeting Notes, pages 5–6: handwritten records, medication and food context, constipation, preparing changes for the doctor | Preserve all existing medication, food, bowel, symptom and visit-report fields. Add printing of the editable visit note.                                     |
| Group Meeting Call Information, page 2: shared paper calendar and both perspectives                                                 | Appointment calendar with date, optional time, location and “Bring or ask” notes. Patient and care partner writing views remain distinct within one account. |
| Product Spec, pages 18–20: readable text, large targets, plain choices                                                              | Locally bundled Atkinson Hyperlegible; large full-row native radio/checkbox selections; flatter ruled sections; no tiny uppercase eyebrows or answer pills.  |
| Product Spec, page 29: accidental duplicate dose entry                                                                              | Ask before recording another dose within ten minutes, including a dose entered from the other writing perspective.                                           |

The reference image informed the desktop sidebar + work area + calendar arrangement. The app does not copy its decorative floating course cards. Phone navigation uses four primary destinations and Settings; sleep and symptoms are reached from Today.

Calendar behavior uses React DayPicker (MIT): https://github.com/gpbl/react-day-picker. Native selection inputs preserve keyboard and assistive-technology behavior. Font: Atkinson Hyperlegible (OFL), bundled through Fontsource, so it does not contact a font service.

Appointments are stored inside the same validated, owner-protected notebook document, so existing database row-level security covers them. Old backups default to an empty appointments list. JSON includes appointments; the diary CSV remains a diary-entry export.

Deferred: separate caregiver accounts/sharing, invitations, reminders, clinical predictions, medication-effect estimates, and live Supabase verification. Appointments are personal notebook records, not external calendar bookings. The example is fictional and resets on reload.
