import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import JalaliPopupDatePicker from "../components/JalaliPopupDatePicker.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";
import { equipmentDefinitionsFromResponse } from "../utils/equipmentDefinitions.js";
import AdvancedFileUploadModal from "../components/AdvancedFileUploadModal.jsx";
import { AttachmentImageEditor } from "./PettyCashPage.jsx";

const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const toEn = (value) => String(value).replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300";
const emptyForm = () => ({ serviceDate: "", categoryId: "", equipmentId: "", description: "", lastServiceDate: "", files: [] });

function equipmentValue(item, fields, kind) {
  const field = fields.find((candidate) => String(candidate.categoryId) === String(item.categoryId) && (kind === "name"
    ? candidate.persianName === "نام تجهیز" || candidate.name === "نام تجهیز" || candidate.englishName === "Equipment Name"
    : candidate.persianName === "کد تجهیز" || candidate.name === "کد تجهیز" || candidate.englishName === "Equipment No."));
  const value = field ? String(item.fieldValues?.[String(field.id)] || "").trim() : "";
  if (value) return value;
  if (kind === "name" && item.name && item.name !== `تجهیز ${item.category}`) return item.name;
  if (kind === "code" && item.code && !/^EQ-[\da-f-]{36}$/i.test(item.code)) return item.code;
  return "—";
}

export default function ServiceMaintenancePage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [definitions, setDefinitions] = useState({ categories: [], fields: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attachmentEditorOpen, setAttachmentEditorOpen] = useState(false);
  const [photoEditIndex, setPhotoEditIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [serviceDateError, setServiceDateError] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};
    Promise.all([
      api("/equipment/service-maintenance", { headers }),
      api("/equipment-identities", { headers }),
      api("/base/equipment-fields", { headers }),
    ]).then(([services, identities, fieldResponse]) => {
      if (!active) return;
      setItems(Array.isArray(services?.items) ? services.items : []);
      setEquipment(Array.isArray(identities?.items) ? identities.items : []);
      setDefinitions(equipmentDefinitionsFromResponse(fieldResponse));
    }).catch((err) => { if (active) setError(err.message || "دریافت اطلاعات سرویس انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const equipmentById = useMemo(() => new Map(equipment.map((item) => [String(item.id), item])), [equipment]);
  const categories = useMemo(() => [...new Map(equipment.filter((item) => item.categoryId != null).map((item) => {
    const category = definitions.categories.find((entry) => String(entry.id) === String(item.categoryId));
    return [String(item.categoryId), { id: item.categoryId, name: category?.name || item.category || "—" }];
  })).values()], [definitions.categories, equipment]);
  const categoryEquipment = useMemo(() => equipment.filter((item) => String(item.categoryId) === String(form.categoryId)), [equipment, form.categoryId]);
  const selectedEquipment = equipmentById.get(String(form.equipmentId));
  const filteredItems = useMemo(() => {
    const terms = toEn(query).trim().toLocaleLowerCase("fa").split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const selected = equipmentById.get(String(item.equipmentId));
      const text = [item.serviceDate, item.lastServiceDate, item.description, selected?.category, selected && equipmentValue(selected, definitions.fields, "name"), selected && equipmentValue(selected, definitions.fields, "code")].join(" ").toLocaleLowerCase("fa");
      return terms.every((term) => text.includes(term));
    });
  }, [items, equipmentById, definitions.fields, query]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);

  async function save(event) {
    event.preventDefault();
    if (!form.serviceDate) { setServiceDateError(true); setError("تاریخ سرویس را انتخاب کنید."); return; }
    if (!form.categoryId || !form.equipmentId) { setError("دسته‌بندی و کد تجهیز را انتخاب کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const files = [];
      for (const attachment of form.files) {
        if (attachment.url && !attachment.url.startsWith("blob:")) {
          files.push({ name: attachment.name, url: attachment.url });
          continue;
        }
        setUploading(true);
        const payload = new FormData();
        payload.append("file", attachment.file);
        const response = await fetch(`${String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "")}/equipment/service-maintenance/upload`, {
          method: "POST", credentials: "include", headers: user?.id != null ? { "x-user-id": String(user.id) } : {}, body: payload,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.file?.url) throw new Error(data.error || "بارگذاری پیوست انجام نشد.");
        files.push(data.file);
        setForm((current) => ({ ...current, files: current.files.map((file) => file === attachment ? data.file : file) }));
      }
      const result = await api("/equipment/service-maintenance", {
        method: "POST",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
        body: JSON.stringify({ serviceDate: form.serviceDate, equipmentId: form.equipmentId, description: form.description, lastServiceDate: form.lastServiceDate, files }),
      });
      setItems((current) => [result.item, ...current]);
      setForm(emptyForm());
      setServiceDateError(false);
      setFormOpen(false);
      setPage(0);
    } catch (err) { setError(err.message || "ثبت سرویس انجام نشد."); }
    finally { setSaving(false); setUploading(false); }
  }

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]"><img src="/images/icons/service.svg" alt="" className="h-6 w-6 dark:invert" /></span>
            <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight md:text-lg">سرویس و نگهداری</span><span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">مدیریت تجهیزات</span></span>
          </div>
          <button type="button" onClick={() => { setFormOpen((open) => !open); setServiceDateError(false); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen} disabled={saving}>
            <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {formOpen && <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="block"><span className={labelClass}>تاریخ سرویس *</span><JalaliPopupDatePicker value={form.serviceDate} onChange={(serviceDate) => { setForm((old) => ({ ...old, serviceDate })); setServiceDateError(false); setError(""); }} placeholder="انتخاب تاریخ سرویس" buttonClassName={`${inputClass} flex items-center justify-between ${serviceDateError ? "!border-red-500" : ""}`} />{serviceDateError && <span role="alert" className="mt-1 block text-xs text-red-600">تاریخ سرویس الزامی است.</span>}</div>
            <label className="block"><span className={labelClass}>دسته‌بندی *</span><select required value={form.categoryId} onChange={(event) => setForm((old) => ({ ...old, categoryId: event.target.value, equipmentId: "" }))} className={inputClass}><option value="">انتخاب دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="block"><span className={labelClass}>کد تجهیز *</span><select required disabled={!form.categoryId} value={form.equipmentId} onChange={(event) => setForm((old) => ({ ...old, equipmentId: event.target.value }))} className={`${inputClass} disabled:opacity-50`}><option value="">انتخاب کد تجهیز</option>{categoryEquipment.map((item) => <option key={item.id} value={item.id}>{equipmentValue(item, definitions.fields, "code")}</option>)}</select></label>
            <label className="block"><span className={labelClass}>نام تجهیز</span><input readOnly value={selectedEquipment ? equipmentValue(selectedEquipment, definitions.fields, "name") : ""} className={`${inputClass} bg-neutral-50 dark:bg-white/[0.03]`} placeholder="پس از انتخاب کد تجهیز نمایش داده می‌شود" /></label>
            <label className="block sm:col-span-2 lg:col-span-3"><span className={labelClass}>شرح تجهیز</span><textarea value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} rows={3} maxLength={10000} className={`${inputClass} h-auto min-h-24 resize-y py-3`} placeholder="شرح سرویس یا وضعیت تجهیز را وارد کنید" /></label>
            <label className="block"><span className={labelClass}>تاریخ آخرین سرویس</span><JalaliPopupDatePicker value={form.lastServiceDate} onChange={(lastServiceDate) => setForm((old) => ({ ...old, lastServiceDate }))} placeholder="انتخاب تاریخ آخرین سرویس" /></label>
            <div className="block"><span className={labelClass}>بارگذاری</span><button type="button" onClick={() => setAttachmentEditorOpen(true)} disabled={saving} className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-white outline-none focus:border-neutral-400 disabled:opacity-50 dark:bg-white/5 ${form.files.length ? "border-emerald-400 bg-emerald-50" : "border-neutral-200 dark:border-white/15"}`} title={form.files.length ? `${toFa(form.files.length)} فایل پیوست‌شده` : "بارگذاری"} aria-label="بارگذاری پیوست"><img src="/images/icons/upload.svg" alt="" className="h-5 w-5 dark:invert" />{form.files.length > 0 && <span className="absolute -left-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] text-white">{toFa(form.files.length)}</span>}</button></div>
          </div>
          <div className="mt-4 flex justify-end border-t border-black/10 pt-4 dark:border-white/10"><button type="submit" disabled={saving || loading || uploading} className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white transition hover:bg-black/90 disabled:opacity-50" title={saving ? "در حال ثبت..." : "ثبت سرویس"} aria-label="ثبت سرویس"><img src="/images/icons/check.svg" alt="" className="h-5 w-5 brightness-0 invert" /></button></div>
        </form>}

        <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"><label className="block"><span className={labelClass}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در تاریخ سرویس، کد، نام و دسته‌بندی تجهیز..." /></label></div>
        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[640px] table-fixed text-sm [&_td]:text-center [&_th]:text-center">
            <colgroup><col style={{ width: 80 }} /><col style={{ width: "22%" }} /><col style={{ width: "22%" }} /><col /><col style={{ width: "22%" }} /></colgroup>
            <thead className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"><tr>{["ردیف", "تاریخ سرویس", "کد تجهیز", "نام تجهیز", "دسته‌بندی"].map((heading) => <th key={heading} className="px-3 py-2 text-[14px] font-semibold">{heading}</th>)}</tr></thead>
            <tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={5} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز سرویسی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => {
              const selected = equipmentById.get(String(item.equipmentId));
              return <tr key={item.id} className="h-10 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10">
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(String(item.serviceDate || "").replaceAll("-", "/"))}</td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words" dir="auto">{selected ? equipmentValue(selected, definitions.fields, "code") : "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 dark:border-neutral-700"><span className="block break-words" dir="auto">{selected ? equipmentValue(selected, definitions.fields, "name") : "—"}</span></td>
                <td className="border-b border-neutral-300 px-3 font-medium dark:border-neutral-700">{selected ? definitions.categories.find((category) => String(category.id) === String(selected.categoryId))?.name || selected.category || "—" : "—"}</td>
              </tr>;
            })}</tbody>
          </table></div>
          <BaseTablePager total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
    {attachmentEditorOpen && <AdvancedFileUploadModal title="بارگذاری پیوست‌های سرویس" files={form.files} multiple accept=".pdf,.jpg,.jpeg,.png,.webp" allowedTypes="PDF، JPG، PNG و WebP" selectionHint={error || "می‌توانید چند فایل را هم‌زمان انتخاب یا رها کنید. حداکثر ۲۰ فایل."} onUpload={(fileList) => {
      const selected = Array.from(fileList || []);
      if (form.files.length + selected.length > 20) return setError("حداکثر ۲۰ فایل انتخاب کنید.");
      const invalid = selected.find((file) => !/\.(jpe?g|png|webp|pdf)$/i.test(file.name) || file.size > 25 * 1024 * 1024);
      if (invalid) return setError("فقط PDF، JPG، PNG یا WebP تا ۲۵ مگابایت مجاز است.");
      setError("");
      setForm((current) => ({ ...current, files: [...current.files, ...selected.map((file) => ({ name: file.name, file }))] }));
    }} onRemove={(index) => setForm((current) => ({ ...current, files: current.files.filter((_, position) => position !== index) }))} isEditableFile={(file) => /\.(jpe?g|png|webp)$/i.test(file.name || "")} onEditFile={(_, index) => { setPhotoEditIndex(index); setAttachmentEditorOpen(false); }} onClose={() => setAttachmentEditorOpen(false)} />}
    {photoEditIndex !== null && form.files[photoEditIndex] && <AttachmentImageEditor initialFile={form.files[photoEditIndex].file} initialUrl={form.files[photoEditIndex].file ? undefined : form.files[photoEditIndex].url} initialName={form.files[photoEditIndex].name} onClose={() => { setPhotoEditIndex(null); setAttachmentEditorOpen(true); }} onConfirm={(file) => { setForm((current) => ({ ...current, files: current.files.map((entry, index) => index === photoEditIndex ? { name: file.name, file } : entry) })); setPhotoEditIndex(null); setAttachmentEditorOpen(true); }} />}
  </div>;
}
