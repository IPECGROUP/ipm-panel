// src/components/ui/PrefixInput.jsx
import React from "react";

export default function PrefixInput({
  prefix,
  value,
  onChange,
  placeholder = "",
  ...rest
}) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800">
      <span className="px-3 py-2 text-xs sm:text-sm text-neutral-300 bg-neutral-900/70 border-l border-neutral-700">
        {prefix}
      </span>
      <input
        {...rest}
        dir="ltr"
        className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm text-neutral-100 placeholder-neutral-400 outline-none"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
