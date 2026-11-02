import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const text = (value, fallback = "—") => escapeHtml(String(value ?? "").trim() || fallback);
const fa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

function attachmentUrl(file) {
  try {
    const url = new URL(String(file?.url || ""), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function openEquipmentIdentityReport({ item, sections, name, code, letters, libraryItems }) {
  const reportWindow = window.open("", "_blank", "width=1150,height=850");
  if (!reportWindow) {
    window.alert("امکان باز کردن پیش‌نمایش وجود ندارد. لطفاً نمایش پنجره‌های بازشو را برای این سایت فعال کنید.");
    return;
  }

  const files = Array.isArray(item.files) ? item.files : [];
  const now = new Date();
  const reportDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" }).format(now);
  const reportTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(now);
  const reportDateTime = `${reportTime} - ${reportDate}`;
  const fieldRows = sections.map(({ title, fields }) => {
    const heading = title.name === "مشخصات تجهیزات" ? "" : `<tr class="section-row"><td colspan="3">${text(title.name)}</td></tr>`;
    return heading + fields.map((field) => {
      const isGroup = /^\d+$/.test(String(field.code || ""));
      const persianName = field.persianName || field.name;
      return `<tr class="${isGroup ? "group-row" : ""}"><td>${text(persianName)}</td><td dir="auto">${isGroup ? "" : text(item.fieldValues?.[String(field.id)])}</td><td dir="ltr">${text(field.englishName)}</td></tr>`;
    }).join("");
  }).join("");
  const fileNames = files.map((file, index) => file.name || `فایل ${fa(index + 1)}`);
  const attachmentPages = files.map((file, index) => {
    const url = attachmentUrl(file);
    const fileName = fileNames[index];
    const type = String(file.type || "").toLowerCase();
    const image = type.startsWith("image/") || /\.(?:png|jpe?g|webp|gif|bmp|svg)(?:[?#]|$)/i.test(file.name || file.url || "");
    const pdf = type.includes("pdf") || /\.pdf(?:[?#]|$)/i.test(file.name || file.url || "");
    const preview = !url ? `<div class="no-preview">آدرس فایل برای پیش‌نمایش در دسترس نیست.</div>`
      : image ? `<img class="attachment-image" src="${escapeHtml(url)}" alt="${text(fileName)}" />`
        : pdf ? `<object class="attachment-pdf" data="${escapeHtml(url)}#view=FitH&toolbar=1" type="application/pdf"><iframe title="${text(fileName)}" src="${escapeHtml(url)}#view=FitH&toolbar=1"></iframe></object><a class="original-file" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">باز کردن و چاپ فایل PDF اصلی</a>`
          : `<div class="no-preview">پیش‌نمایش این نوع فایل در مرورگر پشتیبانی نمی‌شود.</div><a class="original-file" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">باز کردن فایل اصلی</a>`;
    return `<article class="sheet attachment-preview-page"><div class="attachment-preview-header"><span>پیوست شناسنامه ${fa(index + 1)}</span><strong><bdi dir="auto">${text(fileName)}</bdi></strong></div><div class="attachment-preview-body">${preview}</div><footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>پیوست ${fa(index + 1)}</span></footer></article>`;
  }).join("");
  const letterRows = letters.map((letter, index) => `<li><span class="number">${fa(index + 1)}</span><strong>${text(letter.subject || letter.title || letter.letterNo || `سند ${fa(letter.id)}`)}</strong></li>`).join("");
  const libraryRows = libraryItems.map((libraryItem, index) => `<li><span class="number">${fa(index + 1)}</span><strong>${text(libraryItem.title)}${libraryItem.files?.length ? ` — ${libraryItem.files.map((file) => text(file.name)).join("، ")}` : ""}</strong></li>`).join("");
  const origin = window.location.origin;
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>شناسنامه تجهیزات ${text(code, "")}</title><style>
    @font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir.woff2") format("woff2");font-weight:400}
    @font-face{font-family:Vazir;src:url("${origin}/fonts/Vazir-Bold.woff2") format("woff2");font-weight:700}
    @page{size:A4;margin:8mm}*{box-sizing:border-box}
    body{margin:0;background:#eef1f4;color:#16202a;font:9.5px/1.55 Vazir,Tahoma,Arial,sans-serif}
    .toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:8px;padding:12px;background:rgba(238,241,244,.96);border-bottom:1px solid #d7dde3}
    .toolbar button{min-height:38px;border:1px solid #17212b;border-radius:9px;padding:0 16px;background:#17212b;color:#fff;font:700 12px Vazir,Tahoma,sans-serif;cursor:pointer}.toolbar button.secondary{background:#fff;color:#17212b}
    .sheet{width:210mm;min-height:297mm;margin:14px auto;padding:8mm;background:#fff;box-shadow:0 10px 35px rgba(20,30,40,.12)}
    .header{display:grid;grid-template-columns:44mm 1fr 44mm;align-items:center;min-height:21mm;border:1.5px solid #182531;border-radius:11px;overflow:hidden}
    .logo{display:flex;height:100%;align-items:center;justify-content:center;padding:4px;border-left:1px solid #d5dbe0}.logo img{width:38mm;max-height:18mm;object-fit:contain}
    .title{padding:5px 10px;text-align:center}.title h1{margin:0;color:#13212d;font-size:17px;line-height:1.4}.title p{margin:2px 0 0;color:#61707d;font-size:9px}
    .document-meta{height:100%;display:grid;align-content:center;gap:2px;padding:5px 8px;border-right:1px solid #d5dbe0}.document-meta div{display:flex;justify-content:space-between;gap:6px}.document-meta span{color:#6b7782}
    .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}.summary-card{padding:5px 8px;border-radius:8px;background:#f4f7f9;border:1px solid #dce3e8}.summary-card .label{font-size:9px;color:#6c7882;font-weight:700}.summary-card .value{margin-top:2px;color:#14232f;font-size:11px;font-weight:700;overflow-wrap:anywhere}
    section{margin-top:6px}.section-title{display:flex;align-items:center;gap:6px;margin:0 0 4px;color:#172734;font-size:10.5px;font-weight:700}.section-title:before{content:"";width:3px;height:14px;border-radius:4px;background:#1b6c91}
    table{width:100%;border-collapse:collapse;border:1px solid #d7dfe5;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:4px 7px;border:1px solid #e3e8ec;overflow-wrap:anywhere}th{background:#184a6b;color:#fff;font-size:9px;font-weight:700}td{font-size:9px}th:first-child,td:first-child{text-align:right;width:35%}th:nth-child(2),td:nth-child(2){text-align:center;width:30%}th:nth-child(3),td:nth-child(3){text-align:left;width:35%}
    .group-row td{background:#5d92b7;color:#fff;font-weight:700}.section-row td{background:#eef3f6;color:#293945;font-weight:700;text-align:right}
    .attachment-state{display:inline-flex;padding:4px 8px;border-radius:7px;background:${files.length ? "#e4f5eb" : "#f1f3f5"};color:${files.length ? "#176c3a" : "#53606b"};font-weight:700}.attachment-list{margin:5px 0 0;padding:0;list-style:none;border:1px solid #d9e0e5;border-radius:8px;overflow:hidden}.attachment-list li{display:grid;grid-template-columns:9mm 1fr;gap:6px;padding:4px 8px;border-bottom:1px solid #e4e8eb}.attachment-list li:last-child{border-bottom:0}.number{color:#1b6c91;font-weight:700}
    .attachment-preview-page{break-before:page;page-break-before:always;display:flex;flex-direction:column}.attachment-preview-header{display:grid;grid-template-columns:28mm 1fr;align-items:center;gap:10px;min-height:15mm;padding:8px 11px;border:1px solid #d6dee4;border-radius:11px;background:#f4f7f9}.attachment-preview-header span{color:#1b6c91;font-weight:700}.attachment-preview-header strong{overflow-wrap:anywhere}.attachment-preview-body{display:flex;min-height:235mm;flex:1;flex-direction:column;align-items:center;justify-content:center;margin-top:9px;overflow:hidden;border:1px solid #d9e0e5;border-radius:11px;background:#fafbfc}.attachment-image{display:block;width:100%;max-height:235mm;object-fit:contain}.attachment-pdf,.attachment-pdf iframe{display:block;width:100%;min-height:225mm;border:0}.original-file{display:inline-flex;margin:8px;border-radius:8px;background:#17212b;color:#fff;padding:6px 12px;text-decoration:none;font-weight:700}.no-preview{padding:25px;color:#697680;text-align:center}.footer{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:7px;border-top:1px solid #d9e0e5;color:#75818b;font-size:8.5px}
    @media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.sheet+.sheet{margin-top:0}.original-file{display:none}}
    @media screen and (max-width:900px){.sheet{width:calc(100% - 20px);min-height:auto;padding:18px}.header{grid-template-columns:1fr}.logo,.document-meta{border:0;border-bottom:1px solid #d5dbe0}.summary{grid-template-columns:1fr}}
  </style></head><body><div class="toolbar"><button id="print-document" type="button">چاپ / ذخیره PDF</button><button id="close-preview" class="secondary" type="button">بستن پیش‌نمایش</button></div>
    <article class="sheet"><header class="header"><div class="logo"><img src="${origin}/images/light%20mode.png" alt="IPEC" /></div><div class="title"><h1>فرم شناسنامه تجهیزات</h1><p>گزارش مشخصات و مستندات تجهیز</p></div><div class="document-meta"><div><span>کد تجهیز:</span><strong dir="ltr">${text(code)}</strong></div><div><span>تاریخ گزارش:</span><strong>${text(reportDate)}</strong></div></div></header>
      <div class="summary"><div class="summary-card"><div class="label">نام تجهیز</div><div class="value">${text(name)}</div></div><div class="summary-card"><div class="label">دسته‌بندی</div><div class="value">${text(item.category)}</div></div><div class="summary-card"><div class="label">کد تجهیز</div><div class="value" dir="ltr">${text(code)}</div></div></div>
      <section><h2 class="section-title">مشخصات تجهیزات</h2><table dir="rtl"><colgroup><col style="width:35%"><col style="width:30%"><col style="width:35%"></colgroup><thead><tr><th>مشخصات</th><th>مقدار</th><th dir="ltr">Specifications</th></tr></thead><tbody>${fieldRows || `<tr><td colspan="3">مشخصاتی ثبت نشده است.</td></tr>`}</tbody></table></section>
      <section><h2 class="section-title">پیوست‌ها</h2><div class="attachment-state">پیوست: ${files.length ? "دارد" : "ندارد"}</div>${files.length ? `<ul class="attachment-list">${fileNames.map((fileName, index) => `<li><span class="number">${fa(index + 1)}</span><strong><bdi dir="auto">${text(fileName)}</bdi></strong></li>`).join("")}</ul>` : ""}</section>
      ${letters.length ? `<section><h2 class="section-title">اسناد مرتبط</h2><ul class="attachment-list">${letterRows}</ul></section>` : ""}
      ${libraryItems.length ? `<section><h2 class="section-title">مستندات کتابخانه</h2><ul class="attachment-list">${libraryRows}</ul></section>` : ""}
      <footer class="footer"><span>سامانه فرآیندهای یکپارچه شرکت ایده پویان انرژی</span><span>${text(reportDateTime)}</span></footer></article>${attachmentPages}</body></html>`;

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.document.getElementById("close-preview")?.addEventListener("click", () => reportWindow.close());
  reportWindow.document.getElementById("print-document")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "آماده‌سازی پیوست‌ها...";
    try {
      const mainSheet = reportWindow.document.querySelector("article.sheet:not(.attachment-preview-page)");
      const attachmentSheets = [...reportWindow.document.querySelectorAll("article.attachment-preview-page")];
      const sheets = [mainSheet.outerHTML];
      let pdfjs;
      for (const [index, file] of files.entries()) {
        const sheet = attachmentSheets[index];
        const url = attachmentUrl(file);
        const isPdf = /pdf/i.test(file.type || "") || /\.pdf(?:[?#]|$)/i.test(file.name || file.url || "");
        if (!isPdf || !url) { sheets.push(sheet.outerHTML); continue; }
        try {
          if (!pdfjs) {
            pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
          }
          const pdf = await pdfjs.getDocument({ url, withCredentials: true }).promise;
          try {
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
              const printableSheet = sheet.cloneNode(true);
              printableSheet.querySelector(".attachment-preview-header span").textContent = `پیوست شناسنامه ${fa(index + 1)}، صفحه ${fa(pageNumber)} از ${fa(pdf.numPages)}`;
              const image = reportWindow.document.createElement("img");
              image.className = "attachment-image";
              image.alt = `${fileNames[index]}، صفحه ${pageNumber}`;
              image.src = canvas.toDataURL("image/png");
              printableSheet.querySelector(".attachment-preview-body").replaceChildren(image);
              sheets.push(printableSheet.outerHTML);
              canvas.width = 0;
              canvas.height = 0;
              page.cleanup();
            }
          } finally { await pdf.destroy(); }
        } catch (error) {
          console.warn("Unable to render equipment attachment for printing", error);
          const fallbackSheet = sheet.cloneNode(true);
          fallbackSheet.querySelector(".attachment-preview-body").textContent = "نمایش این پیوست برای چاپ ممکن نشد. فایل اصلی را از صفحه شناسنامه باز کنید.";
          sheets.push(fallbackSheet.outerHTML);
        }
      }
      reportWindow.document.getElementById("equipment-identity-print-frame")?.remove();
      const printFrame = reportWindow.document.createElement("iframe");
      printFrame.id = "equipment-identity-print-frame";
      printFrame.title = "چاپ شناسنامه تجهیزات و پیوست‌ها";
      printFrame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
      reportWindow.document.body.appendChild(printFrame);
      const frameDocument = printFrame.contentDocument;
      const frameWindow = printFrame.contentWindow;
      if (!frameDocument || !frameWindow) throw new Error("print_frame_unavailable");
      frameWindow.addEventListener("afterprint", () => window.setTimeout(() => printFrame.remove(), 500), { once: true });
      frameDocument.open();
      frameDocument.write(`<!doctype html><html lang="fa" dir="rtl"><head>${reportWindow.document.head.innerHTML}</head><body>${sheets.join("")}</body></html>`);
      frameDocument.close();
      await Promise.all([frameDocument.fonts?.ready, ...[...frameDocument.querySelectorAll(".attachment-preview-body img")].map((image) => image.decode().catch(() => {}))]);
      frameWindow.focus();
      frameWindow.print();
    } catch (error) {
      console.error("Unable to prepare equipment report for printing", error);
      reportWindow.document.getElementById("equipment-identity-print-frame")?.remove();
      reportWindow.alert("آماده‌سازی گزارش برای چاپ ممکن نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      button.disabled = false;
      button.textContent = "چاپ / ذخیره PDF";
    }
  });
  reportWindow.focus();
}
