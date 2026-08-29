import { useState } from "react";
import BaseOptionsTable from "./BaseOptionsTable.jsx";

const options = [
  { id: "main", label: "انواع قرارداد های اصلی" },
  { id: "sub", label: "انواع قرارداد های فرعی" },
  { id: "status", label: "آخرین وضعیت قرارداد" },
];

export default function ContractManagementSection() {
  const [active, setActive] = useState("main");
  const current = options.find((item) => item.id === active);
  return <section>
    <div className="mb-5 flex w-fit max-w-full overflow-x-auto rounded-2xl border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5">
      {options.map((item) => <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${active === item.id ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white"}`}>{item.label}</button>)}
    </div>
    <BaseOptionsTable key={active} title={current.label} endpoint={`/api/base/contract-options?category=${active}`} />
  </section>;
}
