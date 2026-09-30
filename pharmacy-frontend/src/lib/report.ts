import * as XLSX from 'xlsx';

/** Export rows (first row = header) to a .xlsx file. */
export function exportToExcel(filename: string, sheetName: string, rows: (string | number)[][], colWidths?: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Print a report document (A4 portrait) in a popup window. */
export function printReport(title: string, subtitle: string, thead: string[], rows: (string | number)[][], tfoot?: (string | number)[]) {
  const body = rows
    .map((r) => `<tr>${r.map((c, i) => `<td${typeof c === 'number' ? ' class="n"' : ''}${i === 0 ? '' : ''}>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  const foot = tfoot ? `<tfoot><tr>${tfoot.map((c) => `<th${typeof c === 'number' ? ' class="n"' : ''}>${esc(c)}</th>`).join('')}</tr></tfoot>` : '';
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>` +
    `@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}` +
    `body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000}` +
    `h1{font-size:17px;margin:0}h2{font-size:12px;font-weight:normal;color:#333;margin:2px 0 8px}` +
    `table{width:100%;border-collapse:collapse}th,td{border:1px solid #555;padding:4px 5px;text-align:left;font-size:11px}` +
    `th{background:#eee}.n{text-align:right}tfoot th{background:#f5f5f5}` +
    `.meta{margin-bottom:8px;color:#333}` +
    `</style></head><body>` +
    `<h1>${esc(title)}</h1><h2>${esc(subtitle)} &nbsp;•&nbsp; Printed: ${esc(new Date().toLocaleString())}</h2>` +
    `<table><thead><tr>${thead.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${body}</tbody>${foot}</table>` +
    `<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>` +
    `</body></html>`;
  const w = window.open('', '_blank', 'width=950,height=700');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

/** YYYY-MM-DD of a date input value or Date. */
export const day = (d: Date | string) => {
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** First day of current month as YYYY-MM-DD. */
export const monthStart = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
};
