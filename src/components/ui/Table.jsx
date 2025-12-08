// src/components/ui/Table.jsx
import React from "react";

export const TableWrap = ({ children }) => (
  <div className="border border-white/10 rounded-3xl overflow-hidden bg-white/5">
    {children}
  </div>
);

export const THead = ({ children }) => (
  <thead className="bg-white/5 text-white/80">{children}</thead>
);

export const TR = ({ children }) => (
  <tr className="border-t border-white/10 hover:bg-white/5/50">{children}</tr>
);

export const TH = ({ children, className = "" }) => (
  <th
    className={`p-3 text-right text-sm font-medium text-white/80 ${className}`}
  >
    {children}
  </th>
);

export const TD = ({ children, className = "" }) => (
  <td className={`p-3 align-middle text-sm text-white ${className}`}>
    {children}
  </td>
);
