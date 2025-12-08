// src/components/PrefixInput.jsx
import React, { useRef } from "react";

export default function PrefixInput({ prefix, value, onChange, placeholder = "" }) {
  const ref = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value || "";
    let suffix = v.startsWith(prefix) ? v.slice(prefix.length) : v;
    if (!v.startsWith(prefix)) {
      setTimeout(() => {
        if (ref.current) {
          ref.current.selectionStart = ref.current.selectionEnd = (prefix + suffix).length;
        }
      }, 0);
    }
    onChange(suffix);
  };

  const handleFocus = () => {
    if (ref.current) {
      const pos = (prefix + (value || "")).length;
      ref.current.selectionStart = ref.current.selectionEnd = pos;
    }
  };

  return (
    <input
      ref={ref}
      dir="ltr"
      className="w-full rounded-xl px-2 py-2 font-mono
                 bg-white text-neutral-900 border border-neutral-300 placeholder-neutral-400
                 focus:outline-none focus:ring-2 focus:ring-neutral-300
                 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-400 dark:focus:ring-neutral-600/50"
      value={prefix + (value || "")}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={prefix + placeholder}
      spellCheck={false}
    />
  );
}
