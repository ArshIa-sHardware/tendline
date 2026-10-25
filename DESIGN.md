# tendline design and verification

## Audit and implementation

The previous UI repeated icon tiles, used oversized identity buttons, flattened structured observations into paragraphs, and layered a second stylesheet over the first. This revision replaces the two stylesheets with one token-based system and introduces reusable Brand, Identity, IdentitySwitch and EntrySummary components.

- Identity: a compact native select identifies the author. Initials, explicit role text, circular patient badges and rounded-square caregiver badges distinguish authors without relying on color alone.
- Overview: one primary observation action, a structured sleep summary with expandable details, and a separate visit-preparation surface. No decorative ECG or medical pictograms.
- Journal: dated sections, separate attributed sleep reports, labeled measurements, narrative notes, and a chronological daytime event list. Falls and freezing receive text emphasis only when recorded in the structured fields.
- Sleep: three logical groups—night, observations, personal notes—with all original optional fields retained.
- Check-in: quick logs and expandable symptom categories; native radio and checkbox controls remain.
- Visit brief: document-like layout, restrained comparison bars, editable text, copy/download/print. No new medical inferences.
- Authentication and application metadata use the tendline identity. Signup, login, reset and account persistence are retained.

## Typography evidence and choice

Source Sans 3 replaces Atkinson Hyperlegible. This is a readable contemporary sans-serif, not a claim that it is clinically proven superior for every older adult. Health Literacy Online explicitly lists Source Sans among suitable familiar sans-serif families and recommends larger text for older users:
https://odphp.health.gov/healthliteracyonline/display/section-3-3/

Research examines interacting effects of size, contrast, letter design and age rather than establishing one universally best font:
https://pubmed.ncbi.nlm.nih.gov/26822416/

Body text defaults to 20 CSS pixels, with 100%, 125%, 150% and 200% preferences. Relative type sizes and dedicated enlarged-text reflow preserve content. Existing `larger` preferences map to 125%. The font is locally bundled; font files are included in the app shell's offline cache.

## Palette and interaction

Forest green is reserved for primary actions and visit preparation; stone neutrals form the application frame. Care-partner attribution uses muted slate. Error and recorded-fall emphasis uses a separate brick tone. The design uses open sections and dividers, with elevation limited to the overview, document and focused surfaces.

Controls are generally 48–56 CSS pixels tall. Calendar dates at very narrow widths are 40 pixels wide and 48 high to fit a seven-column month; navigation remains labeled and the appointment form also provides a native date input. Native keyboard behavior, visible focus, reduced motion and color-independent author labels are retained.

## Compatibility and limits

Internal legacy backup format and storage keys intentionally remain unchanged. Existing notebook data and appointments import without conversion. The optional textScale field is validated. The database owner policy and revision checks are unchanged. Separate caregiver accounts are not implemented; both writing perspectives belong to one account.

Live Supabase authentication, email delivery and deployment redirects still require the user's project setup. The app is not deployed and no GitHub repository has been created in this turn.


### Recording flow update
Home and each recording screen expose Log sleep, Log symptoms and Log medication. Medication doses require a name and amount, with optional label strength and notes. Recently recorded names can be reused, but the amount must be entered each time. Laxatives retain their separate tracking category. Legacy unnamed doses remain clearly unspecified; no medicine details are invented. Named doses appear in the journal, CSV and visit report.

The author selector attributes a record within one account; it is not account switching or caregiver authorization. Separate caregiver invitations remain future work. Example sleep records are fictional and now labeled at their source. Theme follows the device by default, with neutral dark surfaces and a manual preference in Settings. Display dates use MM/DD/YYYY and sleep summaries use AM/PM.
