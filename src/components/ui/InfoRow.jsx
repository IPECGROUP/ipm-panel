// src/components/ui/InfoRow.jsx
import React from "react";

export const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-2 items-center">
    <div className="text-sm text-white/70">{label}</div>
    <div className="col-span-2 font-medium text-white">{value}</div>
  </div>
);
