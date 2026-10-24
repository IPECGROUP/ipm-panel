const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const fa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const printValue = (value) => escapeHtml(fa(typeof value === "number" ? value.toLocaleString("en-US") : value === "" || value == null ? "—" : value));

export function openFinancialWorksheetPrintPreview({ title, project, contract, headers, rows }) {
  const preview = window.open("", "_blank", "width=1150,height=850");
  if (!preview) return;

  const origin = window.location.origin;
  const now = new Date();
  const reportDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeZone: "Asia/Tehran" }).format(now);
  const reportTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(now);
  const details = rows.slice(0, -1);
  const totals = rows.at(-1) || [];
  const safeTitle = escapeHtml(title);
  const tableRows = details.length ? details.map((row) => `<tr>${headers.map((_, index) => `<td>${printValue(row[index])}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">ردیفی ثبت نشده است.</td></tr>`;

  const html = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>کاربرگ مالی - ${safeTitle}</title>
<style>
  @font-face { font-family: Vazir; src: url("${origin}/fonts/Vazir.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: Vazir; src: url("${origin}/fonts/Vazir-Bold.woff2") format("woff2"); font-weight: 700; }
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef1f4; color: #16202a; font-family: Vazir, Tahoma, Arial, sans-serif; font-size: 10px; line-height: 1.6; }
  .toolbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: center; gap: 8px; padding: 12px; background: rgba(238,241,244,.96); border-bottom: 1px solid #d7dde3; }
  .toolbar button { min-height: 38px; border: 1px solid #17212b; border-radius: 9px; padding: 0 16px; background: #17212b; color: #fff; font: 700 13px Vazir, Tahoma, sans-serif; cursor: pointer; }
  .toolbar button.secondary { background: #fff; color: #17212b; }
  .sheet { width: 210mm; min-height: 297mm; margin: 14px auto; padding: 8mm; background: #fff; box-shadow: 0 10px 35px rgba(20,30,40,.12); display: flex; flex-direction: column; }
  .header { display: grid; grid-template-columns: 44mm 1fr 44mm; align-items: center; min-height: 21mm; border: 1.5px solid #182531; border-radius: 11px; overflow: hidden; }
  .logo { display: flex; height: 100%; align-items: center; justify-content: center; padding: 4px; border-left: 1px solid #d5dbe0; }
  .logo img { width: 38mm; max-height: 18mm; object-fit: contain; }
  .title { padding: 5px 10px; text-align: center; }
  .title h1 { margin: 0; color: #13212d; font-size: 17px; line-height: 1.4; }
  .title p { margin: 2px 0 0; color: #61707d; font-size: 9px; }
  .document-meta { height: 100%; display: grid; align-content: center; gap: 2px; padding: 5px 8px; border-right: 1px solid #d5dbe0; }
  .document-meta div { display: flex; justify-content: space-between; gap: 6px; }
  .document-meta span, .label { color: #6b7782; }
  section { margin-top: 9px; }
  .section-title { display: flex; align-items: center; gap: 6px; margin: 0 0 5px; color: #172734; font-size: 11px; font-weight: 700; }
  .section-title::before { content: ""; width: 3px; height: 14px; border-radius: 4px; background: #1b6c91; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #d8e0e6; border-radius: 11px; overflow: hidden; }
  .info-card { min-height: 42px; padding: 5px 8px; border-left: 1px solid #e1e6ea; }
  .info-card:last-child { border-left: 0; }
  .label { font-size: 9px; font-weight: 700; }
  .value { margin-top: 2px; color: #17232d; font-size: 10px; font-weight: 700; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #d7dfe5; border-radius: 11px; }
  th, td { padding: 6px; text-align: center; vertical-align: middle; border-bottom: 1px solid #e3e8ec; border-left: 1px solid #e3e8ec; overflow-wrap: anywhere; }
  th { background: #eef3f6; color: #293945; font-size: 9px; font-weight: 700; }
  td { font-size: 9px; }
  th:last-child, td:last-child { border-left: 0; }
  tbody tr:last-child td { border-bottom: 0; }
  tfoot td { background: #f4f7f9; color: #172734; font-weight: 700; border-bottom: 0; }
  .footer { display: flex; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 7px; border-top: 1px solid #d9e0e5; color: #75818b; font-size: 8.5px; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .toolbar { display: none; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; display: block; }
    thead { display: table-header-group; }
    tfoot { display: table-row-group; }
    tr { break-inside: avoid; }
    .header, .info-grid, .section-title { break-inside: avoid; }
    .footer { margin-top: 14px; }
  }
  @media screen and (max-width: 900px) {
    .sheet { width: calc(100% - 20px); min-height: auto; padding: 18px; }
    .header { grid-template-columns: 1fr; }
    .logo, .document-meta { border: 0; border-bottom: 1px solid #d5dbe0; }
    .info-grid { grid-template-columns: 1fr; }
    .info-card { border-left: 0; border-bottom: 1px solid #e1e6ea; }
    .info-card:last-child { border-bottom: 0; }
  }
</style></head><body>
  <div class="toolbar"><button id="print-document" type="button">چاپ / ذخیره PDF</button><button id="close-preview" class="secondary" type="button">بستن پیش‌نمایش</button></div>
  <article class="sheet">
    <header class="header">
      <div class="logo"><img src="${origin}/images/light%20mode.png" alt="IPEC" /></div>
      <div class="title"><h1>فرم کاربرگ مالی</h1><p>گزارش رسمی اطلاعات ${safeTitle}</p></div>
      <div class="document-meta"><div><span>تاریخ:</span><strong>${escapeHtml(reportDate)}</strong></div><div><span>ساعت:</span><strong>${escapeHtml(reportTime)}</strong></div></div>
    </header>
    <section><h2 class="section-title">مشخصات کاربرگ</h2><div class="info-grid">
      <div class="info-card"><div class="label">پروژه</div><div class="value">${printValue(project)}</div></div>
      <div class="info-card"><div class="label">قرارداد</div><div class="value">${printValue(contract)}</div></div>
      <div class="info-card"><div class="label">بخش</div><div class="value">${safeTitle}</div></div>
    </div></section>
    <section><h2 class="section-title">جزئیات ${safeTitle}</h2>
      <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
      <tfoot><tr>${headers.map((_, index) => `<td>${printValue(totals[index])}</td>`).join("")}</tr></tfoot></table>
    </section>
    <footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${escapeHtml(reportTime)} - ${escapeHtml(reportDate)}</span></footer>
  </article>
</body></html>`;

  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  preview.document.getElementById("print-document")?.addEventListener("click", async () => {
    await preview.document.fonts.ready;
    preview.focus();
    preview.print();
  });
  preview.document.getElementById("close-preview")?.addEventListener("click", () => preview.close());
  preview.focus();
}
