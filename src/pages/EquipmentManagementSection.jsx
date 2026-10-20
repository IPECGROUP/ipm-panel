import { useState } from "react";
import EquipmentCategoriesTable from "../components/EquipmentCategoriesTable.jsx";
import EquipmentCategoryTree from "../components/EquipmentCategoryTree.jsx";

export default function EquipmentManagementSection() {
  const [active, setActive] = useState("categories");

  return <section dir="rtl">
    <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="بخش‌های مدیریت تجهیزات">
      {[
        { id: "categories", label: "دسته‌بندی تجهیزات" },
        { id: "specifications", label: "مشخصات تجهیزات" },
      ].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${active === tab.id ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}>{tab.label}</button>)}
    </div>
    <div role="tabpanel" className="-mx-4 p-4">{active === "categories" ? <EquipmentCategoriesTable /> : <EquipmentCategoryTree />}</div>
  </section>;
}
