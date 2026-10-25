import { dayKey, entryDay, fmtTime, KIND_LABEL, nameFor, summarize, type Notebook } from './model';
export function download(name: string, value: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const backupText = (n: Notebook) =>
  JSON.stringify(
    {
      format: 'bedside-notebook-backup',
      version: 4,
      exportedAt: new Date().toISOString(),
      notebook: n,
    },
    null,
    2,
  );
export const backup = (n: Notebook) =>
  download(`tendline-backup-${dayKey()}.json`, backupText(n), 'application/json');
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@\-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvText(n: Notebook) {
  return (
    '\ufeff' +
    [
      ['Date', 'Time', 'Author', 'Type', 'Details'],
      ...n.entries.map((e) => [
        entryDay(e),
        e.kind === 'night' ? '' : fmtTime(e.t),
        nameFor(n, e.who),
        KIND_LABEL[e.kind],
        summarize(e),
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
