const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const fa = (value) => String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
const text = (value, fallback = "—") => escapeHtml(fa(String(value ?? "").trim() || fallback));
const amount = (value) => {
  try { return BigInt(value || 0).toLocaleString("fa-IR"); }
  catch { return "۰"; }
};
const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran",
  }).format(parsed);
};
const actionName = (entry) => {
  if (entry.action === "submitted") return "ثبت گزارش";
  if (entry.action === "resubmitted") return "ارسال مجدد گزارش";
  const choices = (entry.changes || []).map((change) => change.decision);
  if (choices.length && choices.every((choice) => choice === "approve")) return "تأیید";
  if (choices.length && choices.every((choice) => choice === "reject")) return "رد";
  if (choices.length && choices.every((choice) => choice === "revision")) return "درخواست اصلاح";
  return "بررسی ردیف‌ها";
};
const attachmentUrl = (value) => {
  try {
    const url = new URL(String(value || ""), window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/uploads/petty-cash-expenses/") ? url.href : "";
  } catch { return ""; }
};

export function openPettyCashReportPdf(report) {
  if (!report?.items?.length || !report.items.every((item) => item.stage === "completed")) return;
  const preview = window.open("", "_blank", "width=1150,height=850");
  if (!preview) {
    window.alert("امکان باز کردن پیش‌نمایش وجود ندارد. لطفاً نمایش پنجره‌های بازشو را برای این سایت فعال کنید.");
    return;
  }
  const rows = report.items;
  const total = rows.reduce((sum, item) => { try { return sum + BigInt(item.amount || 0); } catch { return sum; } }, 0n);
  const history = Array.isArray(report.historyJson) ? report.historyJson : [];
  const logoUrl = `${window.location.origin}/images/light%20mode.png`;
  const fontUrl = `${window.location.origin}/fonts/Vazir.woff2`;
  const boldFontUrl = `${window.location.origin}/fonts/Vazir-Bold.woff2`;
  const info = (label, value) => `<div class="info-card"><div class="label">${escapeHtml(label)}</div><div class="value">${text(value)}</div></div>`;
  const itemRows = rows.map((item, index) => `<tr>
    <td>${text(index + 1)}</td><td>${text(item.expenseDate)}</td><td>${text(item.description)}</td>
    <td>${text(item.budgetCode)}</td><td class="amount">${escapeHtml(amount(item.amount))}</td>
    <td><span class="status">تأیید شده</span></td><td>${text(item.fileName)}</td>
  </tr>`).join("");
  const historyRows = history.map((entry, index) => `<tr>
    <td>${text(index + 1)}</td><td>${text(actionName(entry))}</td>
    <td>${text(entry.actorName || `کاربر ${entry.userId || "—"}`)}</td>
    <td>${text(date(entry.at))}</td><td>${text((entry.changes || []).length || "—")}</td>
    <td>${text(entry.note)}</td>
  </tr>`).join("");
  const attachmentPages = rows.map((item, index) => {
    const url = attachmentUrl(item.fileUrl);
    return `<article class="sheet attachment-page">
      <div class="attachment-heading"><span>پیوست ردیف ${text(index + 1)}</span><strong>${text(item.fileName)}</strong></div>
      <div class="attachment-details">${text(item.description)} · ${text(item.budgetCode)} · ${escapeHtml(amount(item.amount))} ریال</div>
      <div class="attachment-body">${url ? `<img src="${escapeHtml(url)}" alt="پیوست ردیف ${text(index + 1)}" />` : "پیش‌نمایش پیوست در دسترس نیست."}</div>
      <footer class="page-footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>پیوست ${text(index + 1)} از ${text(rows.length)}</span></footer>
    </article>`;
  }).join("");
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>گزارش تنخواه ${text(report.reportName, "")}</title><style>
    @font-face { font-family: Vazir; src: url("${fontUrl}") format("woff2"); font-weight: 400; }
    @font-face { font-family: Vazir; src: url("${boldFontUrl}") format("woff2"); font-weight: 700; }
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef1f4; color: #16202a; font: 9.5px/1.6 Vazir, Tahoma, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 12px; background: rgba(238,241,244,.96); border-bottom: 1px solid #d7dde3; }
    .toolbar button { min-height: 40px; border: 1px solid #17212b; border-radius: 9px; padding: 0 16px; background: #17212b; color: #fff; font: 700 12px Vazir, Tahoma, sans-serif; cursor: pointer; }
    .toolbar button.secondary { background: #fff; color: #17212b; }
    .sheet { width: min(210mm, calc(100vw - 20px)); min-height: 297mm; margin: 14px auto; padding: 8mm; background: #fff; box-shadow: 0 10px 35px rgba(20,30,40,.12); }
    .header { display: grid; grid-template-columns: 44mm 1fr 44mm; align-items: center; min-height: 21mm; border: 1.5px solid #182531; border-radius: 11px; overflow: hidden; }
    .logo { display: flex; height: 100%; align-items: center; justify-content: center; padding: 4px; border-left: 1px solid #d5dbe0; }
    .logo img { width: 38mm; max-height: 18mm; object-fit: contain; }
    .title { padding: 5px 10px; text-align: center; }
    .title h1 { margin: 0; color: #13212d; font-size: 17px; line-height: 1.4; }
    .title p { margin: 2px 0 0; color: #61707d; font-size: 9px; }
    .document-meta { height: 100%; display: grid; align-content: center; gap: 2px; padding: 5px 8px; border-right: 1px solid #d5dbe0; }
    .document-meta div { display: flex; justify-content: space-between; gap: 6px; }
    .document-meta span, .label { color: #6b7782; }
    section { margin-top: 10px; }
    .section-title { display: flex; align-items: center; gap: 6px; margin: 0 0 4px; color: #172734; font-size: 10.5px; font-weight: 700; }
    .section-title::before { content: ""; width: 3px; height: 14px; border-radius: 4px; background: #1b6c91; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #d8e0e6; border-radius: 11px; overflow: hidden; }
    .info-card { min-height: 38px; padding: 4px 7px; border-left: 1px solid #e1e6ea; border-bottom: 1px solid #e1e6ea; break-inside: avoid; }
    .info-card:nth-child(3n) { border-left: 0; }
    .label { font-size: 9px; font-weight: 700; }
    .value { margin-top: 1px; color: #17232d; font-weight: 700; white-space: pre-wrap; overflow-wrap: anywhere; }
    .table-wrap { max-width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #d7dfe5; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 4px 6px; text-align: right; vertical-align: top; border: 1px solid #e3e8ec; overflow-wrap: anywhere; }
    th { background: #eef3f6; color: #293945; font-size: 9px; font-weight: 700; }
    .amount { white-space: nowrap; }
    .status { display: inline-block; padding: 2px 6px; border-radius: 99px; background: #e3f5ea; color: #15713a; font-size: 8.5px; font-weight: 700; white-space: nowrap; }
    .attachment-heading { display: flex; justify-content: space-between; gap: 10px; min-height: 15mm; align-items: center; padding: 8px 11px; border: 1px solid #d6dee4; border-radius: 11px; background: #f4f7f9; }
    .attachment-details { margin-top: 8px; color: #53606b; }
    .attachment-body { display: flex; min-height: 235mm; align-items: center; justify-content: center; margin-top: 9px; overflow: hidden; border: 1px solid #d9e0e5; border-radius: 11px; background: #fafbfc; }
    .attachment-body img { display: block; max-width: 100%; max-height: 235mm; object-fit: contain; }
    .attachment-page { break-before: page; page-break-before: always; }
    .page-footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 13px; padding-top: 7px; border-top: 1px solid #d9e0e5; color: #75818b; font-size: 8.5px; }
    @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .toolbar { display: none; } .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; } .attachment-page { break-before: page; } }
    @media screen and (max-width: 900px) { .sheet { width: calc(100vw - 20px); min-height: auto; padding: 18px; } .header { grid-template-columns: minmax(0,1fr); } .logo, .document-meta { border: 0; border-bottom: 1px solid #d5dbe0; } .info-grid { grid-template-columns: minmax(0,1fr); } .info-card { border-left: 0; } .attachment-body { min-height: 50vh; } }
  </style></head><body>
    <div class="toolbar"><button id="print-document" type="button">چاپ / ذخیره PDF</button><button id="close-preview" class="secondary" type="button">بستن پیش‌نمایش</button></div>
    <article class="sheet"><header class="header">
      <div class="logo"><img src="${logoUrl}" alt="IPEC" /></div>
      <div class="title"><h1>فرم گزارش تنخواه</h1><p>گزارش رسمی ردیف‌ها و گردش تأیید</p></div>
      <div class="document-meta"><div><span>شماره:</span><strong>${text(report.reportName)}</strong></div><div><span>تاریخ:</span><strong>${text(date(report.createdAt))}</strong></div></div>
    </header>
    <section><h2 class="section-title">مشخصات گزارش</h2><div class="info-grid">
      ${info("درخواست‌کننده", report.createdByName || report.createdByUsername)}
      ${info("پروژه", `${report.projectCode || ""} - ${report.projectName || ""}`)}
      ${info("تعداد ردیف‌ها", rows.length)}
      ${info("مبلغ کل", `${amount(total)} ریال`)}
      ${info("وضعیت", "تأیید نهایی شده")}
      ${info("تاریخ ثبت", date(report.createdAt))}
    </div></section>
    <section><h2 class="section-title">جزئیات ردیف‌های گزارش</h2><div class="table-wrap"><table>
      <thead><tr><th>ردیف</th><th>تاریخ هزینه</th><th>شرح</th><th>کد بودجه</th><th>مبلغ (ریال)</th><th>وضعیت</th><th>پیوست</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table></div></section>
    <section><h2 class="section-title">فرآیند بررسی و تأیید</h2><div class="table-wrap"><table>
      <thead><tr><th>ردیف</th><th>اقدام</th><th>انجام‌دهنده</th><th>تاریخ و ساعت</th><th>تعداد ردیف</th><th>توضیحات</th></tr></thead>
      <tbody>${historyRows || '<tr><td colspan="6">تاریخچه‌ای ثبت نشده است.</td></tr>'}</tbody>
    </table></div></section>
    <section><h2 class="section-title">پیوست‌های گزارش</h2><div class="value">${text(rows.length)} پیوست</div></section>
    <footer class="page-footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${text(date(new Date()))}</span></footer>
    </article>${attachmentPages}
  </body></html>`;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  preview.document.getElementById("print-document")?.addEventListener("click", () => preview.print());
  preview.document.getElementById("close-preview")?.addEventListener("click", () => preview.close());
}
