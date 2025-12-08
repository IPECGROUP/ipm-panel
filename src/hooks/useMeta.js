// src/hooks/useMeta.js
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export function useMeta() {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const t = await api("/meta/budget-types");
        setTypes(
          (t.types || []).map((x) => ({
            ...x,
            label: (x.label || "")
              .replace(/\s*\(CAPEX\)\s*/i, "")
              .trim(),
          }))
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return { types };
}
