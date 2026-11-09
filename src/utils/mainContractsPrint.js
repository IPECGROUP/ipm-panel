const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export function openMainContractsPrintPreview(rows, { includeAmounts = true, previewWindow = null } = {}) {
  const preview = previewWindow || window.open("", "_blank", "width=1150,height=850");
  if (!preview) return;
  const origin = window.location.origin;
  const now = new Date();
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeZone: "Asia/Tehran" }).format(now);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(now);
  const value = (input) => escapeHtml(String(input ?? "").trim() || "—");
  const body = rows.length ? rows.map((row) => `<tr>
    <td>${value(row.number)}</td>
    <td class="right"><strong>${value(row.employer)}</strong><div class="secondary-text">${value(row.subject)}</div></td>
    <td>${value(row.type)}</td>
    <td><div>${value(row.start)}</div><div class="secondary-text">${value(row.end)}</div></td>
    ${includeAmounts ? `<td>${row.amounts.length ? row.amounts.map((amount) => `<div>${value(amount)}</div>`).join("") : "—"}</td>` : ""}
    <td>${value(row.status)}</td>
  </tr>`).join("") : `<tr><td colspan="${includeAmounts ? 6 : 5}">قرارداد اصلی ثبت نشده است.</td></tr>`;
  const modeLabel = includeAmounts ? "با مبلغ" : "بدون مبلغ";
  preview.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لیست قراردادهای اصلی ${modeLabel}</title>
  <style>
    @font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir.woff2") format("woff2");font-weight:400}
    @font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir-Bold.woff2") format("woff2");font-weight:700}
    @page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;background:#eef1f4;color:#16202a;font:10px/1.6 Vazir,Tahoma,Arial,sans-serif}
    .toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:8px;padding:12px;background:rgba(238,241,244,.96);border-bottom:1px solid #d7dde3}
    .toolbar button{min-height:38px;border:1px solid #17212b;border-radius:9px;padding:0 16px;background:#17212b;color:#fff;font:700 13px Vazir,Tahoma,sans-serif;cursor:pointer}.toolbar .secondary{background:#fff;color:#17212b}
    .sheet{width:210mm;min-height:297mm;margin:14px auto;padding:8mm;background:#fff;box-shadow:0 10px 35px rgba(20,30,40,.12)}
    .header{display:grid;grid-template-columns:44mm 1fr 44mm;align-items:center;min-height:21mm;border:1.5px solid #182531;border-radius:11px;overflow:hidden}
    .logo{display:flex;height:100%;align-items:center;justify-content:center;padding:4px;border-left:1px solid #d5dbe0}.logo img{width:38mm;max-height:18mm;object-fit:contain}
    .title{padding:5px 10px;text-align:center}.title h1{margin:0;color:#13212d;font-size:17px;line-height:1.4}.title p{margin:2px 0 0;color:#61707d;font-size:9px}
    .document-meta{height:100%;display:grid;align-content:center;gap:2px;padding:5px 8px;border-right:1px solid #d5dbe0}.document-meta div{display:flex;justify-content:space-between;gap:6px}.document-meta span{color:#6b7782}
    section{margin-top:9px}.section-title{display:flex;align-items:center;gap:6px;margin:0 0 5px;color:#172734;font-size:11px}.section-title:before{content:"";width:3px;height:14px;border-radius:4px;background:#1b6c91}
    table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;border:1px solid #d7dfe5;border-radius:11px}th,td{padding:6px;text-align:center;vertical-align:middle;border-bottom:1px solid #e3e8ec;border-left:1px solid #e3e8ec;overflow-wrap:anywhere}th{background:#eef3f6;color:#293945;font-size:9px}td{font-size:9px}th:last-child,td:last-child{border-left:0}tbody tr:last-child td{border-bottom:0}.right{text-align:right}.secondary-text{margin-top:3px;color:#697783;font-size:8.5px}.footer{display:flex;justify-content:space-between;gap:10px;margin-top:14px;padding-top:7px;border-top:1px solid #d9e0e5;color:#75818b;font-size:8.5px}
    @media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}thead{display:table-header-group}tr{break-inside:avoid}.header,.section-title{break-inside:avoid}}
    @media screen and (max-width:900px){.sheet{width:calc(100% - 20px);min-height:auto;padding:18px}.header{grid-template-columns:1fr}.logo,.document-meta{border:0;border-bottom:1px solid #d5dbe0}}
  </style></head><body><div class="toolbar"><button id="print-document" type="button">چاپ / ذخیره PDF</button><button id="close-preview" class="secondary" type="button">بستن پیش‌نمایش</button></div>
  <article class="sheet"><header class="header"><div class="logo"><img src="${origin}/images/IPEC%20Persian%20Energy%20Process%20Logo.webp" alt="IPEC"></div><div class="title"><h1>لیست قراردادهای اصلی</h1><p>گزارش قراردادهای اصلی ${modeLabel}</p></div><div class="document-meta"><div><span>تاریخ:</span><strong>${value(date)}</strong></div><div><span>ساعت:</span><strong>${value(time)}</strong></div></div></header>
  <section><h2 class="section-title">فهرست قراردادها</h2><table><colgroup><col style="width:6%"><col style="width:${includeAmounts ? 32 : 39}%"><col style="width:${includeAmounts ? 14 : 17}%"><col style="width:${includeAmounts ? 14 : 17}%">${includeAmounts ? '<col style="width:17%">' : ""}<col style="width:${includeAmounts ? 17 : 21}%"></colgroup><thead><tr><th>ردیف</th><th>کارفرما / موضوع قرارداد</th><th>نوع قرارداد</th><th>شروع / پایان</th>${includeAmounts ? "<th>مبلغ</th>" : ""}<th>آخرین وضعیت</th></tr></thead><tbody>${body}</tbody></table></section><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${value(time)} - ${value(date)}</span></footer></article></body></html>`);
  preview.document.close();
  preview.document.getElementById("print-document")?.addEventListener("click", async () => { await preview.document.fonts.ready; preview.focus(); preview.print(); });
  preview.document.getElementById("close-preview")?.addEventListener("click", () => preview.close());
  preview.focus();
}
