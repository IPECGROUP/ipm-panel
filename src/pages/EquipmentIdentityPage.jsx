import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import BaseTablePager from "../components/ui/BaseTablePager.jsx";
import { useAuth } from "../components/AuthProvider.jsx";
import { api } from "../utils/api.js";

const inputClass = "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-right text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/15 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500";
const labelClass = "mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300";
const tagColors = [
  "border-[#D5E6F1] bg-[#D5E6F1] text-[#036499]",
  "border-[#D1FAE5] bg-[#D1FAE5] text-[#047857]",
  "border-[#FEF3C7] bg-[#FEF3C7] text-[#B45309]",
  "border-[#EDE9FE] bg-[#EDE9FE] text-[#6D28D9]",
  "border-[#FFE4E6] bg-[#FFE4E6] text-[#BE123C]",
  "border-[#CCFBF1] bg-[#CCFBF1] text-[#0F766E]",
];
const selectedTagColors = [
  "border-[#036499] bg-[#036499] text-[#D5E6F1]",
  "border-[#047857] bg-[#047857] text-[#D1FAE5]",
  "border-[#B45309] bg-[#B45309] text-[#FEF3C7]",
  "border-[#6D28D9] bg-[#6D28D9] text-[#EDE9FE]",
  "border-[#BE123C] bg-[#BE123C] text-[#FFE4E6]",
  "border-[#0F766E] bg-[#0F766E] text-[#CCFBF1]",
];
const toFa = (value) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const emptyForm = () => ({ code: "", name: "", category: "", tagIds: [] });

export default function EquipmentIdentityPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const headers = user?.id != null ? { "x-user-id": String(user.id) } : {};
    Promise.allSettled([api("/equipment-identities", { headers }), api("/tags", { headers })])
      .then(([equipment, tagData]) => {
        if (!active) return;
        if (equipment.status === "fulfilled") setItems(Array.isArray(equipment.value?.items) ? equipment.value.items : []);
        else setError(equipment.reason?.message || "دریافت اطلاعات تجهیزات انجام نشد.");
        if (tagData.status === "fulfilled") setTags(Array.isArray(tagData.value?.items) ? tagData.value.items : []);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const visibleTags = useMemo(() => tags.filter((tag) => items.some((item) => item.tagIds?.map(String).includes(String(tag.id)))), [items, tags]);
  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fa");
    return items.filter((item) => {
      const matchesText = !term || [item.code, item.name, item.category].join(" ").toLocaleLowerCase("fa").includes(term);
      const matchesTags = !filterTagIds.length || filterTagIds.some((id) => item.tagIds?.map(String).includes(String(id)));
      return matchesText && matchesTags;
    });
  }, [items, query, filterTagIds]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filteredItems.length / pageSize) - 1));
  const pageItems = filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleTag = (id, selected, setSelected) => setSelected(selected.includes(String(id)) ? selected.filter((value) => value !== String(id)) : [...selected, String(id)]);

  async function save(event) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setError("کد تجهیز و نام تجهیز را وارد کنید."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api("/equipment-identities", {
        method: "POST",
        headers: user?.id != null ? { "x-user-id": String(user.id) } : {},
        body: JSON.stringify(form),
      });
      setItems((current) => [result.item, ...current]);
      setForm(emptyForm());
      setFormOpen(false);
      setPage(0);
    } catch (err) {
      setError(err.message === "duplicate_code" ? "این کد تجهیز قبلاً ثبت شده است." : err.message || "ثبت تجهیز انجام نشد.");
    } finally { setSaving(false); }
  }

  return <div dir="rtl" className="mx-auto max-w-[1400px]">
    <Card className="overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-neutral-900">
      <div className="p-3 md:p-4">
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3 border-b border-black/[0.07] pb-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-black/10 bg-gradient-to-br from-neutral-50 to-neutral-200/70 shadow-sm dark:border-white/10 dark:from-white/[0.12] dark:to-white/[0.04]">
              <img src="/images/icons/shenasnameh-taghizat.svg" alt="" className="h-6 w-6 dark:invert" />
            </span>
            <span className="block truncate text-base font-bold tracking-tight md:text-lg">شناسنامه تجهیزات</span>
          </div>
          <button type="button" onClick={() => { setFormOpen((open) => !open); setError(""); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/15 bg-white transition hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title={formOpen ? "بستن فرم" : "افزودن"} aria-label={formOpen ? "بستن فرم" : "افزودن"} aria-expanded={formOpen}>
            <img src={formOpen ? "/images/icons/listdarkhast.svg" : "/images/icons/afzodan.svg"} alt="" className="h-5 w-5 dark:invert" />
          </button>
        </div>

        {formOpen ? <form onSubmit={save} className="mb-4 rounded-2xl border border-black/10 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[.03]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[150px] flex-1"><span className={`block ${labelClass}`}>کد تجهیز *</span><input autoFocus maxLength={80} value={form.code} onChange={(event) => setForm((old) => ({ ...old, code: event.target.value }))} className={inputClass} /></label>
            <label className="min-w-[190px] flex-[1.4]"><span className={`block ${labelClass}`}>نام تجهیز *</span><input maxLength={255} value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} className={inputClass} /></label>
            <label className="min-w-[170px] flex-1"><span className={`block ${labelClass}`}>دسته‌بندی</span><input maxLength={120} value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value }))} className={inputClass} /></label>
            <button type="submit" disabled={saving} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-black/10 bg-white transition hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10" title="افزودن به جدول" aria-label="افزودن به جدول"><img src="/images/icons/afzodan.svg" alt="" className="h-4 w-4 dark:invert" /></button>
          </div>
          {tags.length > 0 && <div className="mt-3"><div className={labelClass}>برچسب‌ها</div><div className="flex flex-wrap gap-2">{tags.map((tag, index) => <button key={tag.id} type="button" onClick={() => setForm((old) => ({ ...old, tagIds: old.tagIds.includes(String(tag.id)) ? old.tagIds.filter((id) => id !== String(tag.id)) : [...old.tagIds, String(tag.id)] }))} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.tagIds.includes(String(tag.id)) ? selectedTagColors[index % selectedTagColors.length] : tagColors[index % tagColors.length]}`}>{tag.label}</button>)}</div></div>}
        </form> : <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <label className="block"><span className={`block ${labelClass}`}>جست و جو</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} className={inputClass} placeholder="جستجو در کد تجهیز، نام تجهیز و دسته‌بندی..." /></label>
          <div className="mt-2"><div className={labelClass}>برچسب‌ها</div><div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">{visibleTags.map((tag, index) => <button key={tag.id} type="button" onClick={() => { toggleTag(tag.id, filterTagIds, setFilterTagIds); setPage(0); }} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition hover:brightness-95 ${filterTagIds.includes(String(tag.id)) ? selectedTagColors[index % selectedTagColors.length] : tagColors[index % tagColors.length]}`}>{tag.label}</button>)}</div></div>
        </div>}

        {error && <div role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="overflow-auto" dir="ltr"><table dir="rtl" className="w-full min-w-[600px] table-fixed text-sm [&_td]:text-center [&_th]:text-center"><colgroup><col style={{ width: 80 }} /><col style={{ width: "24%" }} /><col /><col style={{ width: "25%" }} /></colgroup><thead><tr className="border-b border-neutral-300 bg-neutral-200 text-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">{["ردیف", "کد تجهیز", "نام تجهیز", "دسته‌بندی"].map((heading) => <th key={heading} className="px-3 py-2 text-[14px] font-semibold md:text-[15px]">{heading}</th>)}</tr></thead><tbody className="text-[13px]">{loading || !pageItems.length ? <tr><td colSpan={4} className="py-8 text-black/60 dark:text-neutral-400">{loading ? "در حال دریافت..." : items.length ? "موردی مطابق فیلتر پیدا نشد." : "هنوز تجهیزی ثبت نشده است."}</td></tr> : pageItems.map((item, index) => <tr key={item.id} className="h-10 bg-black/[0.02] transition-colors hover:bg-black/[0.04] dark:bg-white/5 dark:hover:bg-white/10"><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{toFa(safePage * pageSize + index + 1)}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700" dir="auto">{item.code}</td><td className="border-b border-neutral-300 px-3 font-medium dark:border-neutral-700">{item.name}</td><td className="border-b border-neutral-300 px-3 dark:border-neutral-700">{item.category || "—"}</td></tr>)}</tbody></table></div>
          <BaseTablePager total={filteredItems.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </Card>
  </div>;
}
