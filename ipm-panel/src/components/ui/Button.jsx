// src/components/ui/Button.jsx
import React from "react";
import { Link } from "react-router-dom";

export const Btn = ({ className = "", children, ...props }) => (
  <button
    {...props}
    className={
      `px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-white ` +
      `hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/20 ` +
      className
    }
  >
    {children}
  </button>
);

export const DangerBtn = ({ className = "", children, ...props }) => (
  <button
    {...props}
    className={
      `px-3 py-2 rounded-2xl border border-red-500/30 text-red-300 bg-transparent ` +
      `hover:bg-red-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-red-500/40 ` +
      className
    }
  >
    {children}
  </button>
);

export const PrimaryBtn = ({ className = "", children, ...props }) => (
  <button
    {...props}
    className={
      `px-4 py-2 rounded-2xl bg-white text-zinc-900 border border-white/20 ` +
      `hover:bg-transparent hover:text-white hover:border-white/40 transition ` +
      `shadow-[0_1px_0_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-white/30 ` +
      className
    }
  >
    {children}
  </button>
);

export const LinkBtn = ({ to, children, className = "", variant = "ghost", ...props }) => {
  const base =
    "block text-center rounded-2xl px-3 py-2 border transition focus:outline-none focus:ring-2";
  const v =
    variant === "primary"
      ? "bg-white text-zinc-900 border-white/20 hover:bg-transparent hover:text-white hover:border-white/40 focus:ring-white/30"
      : "border-white/10 text-white bg-white/5 hover:bg-white/10 focus:ring-white/20";

  return (
    <Link to={to} {...props} className={`${base} ${v} ${className}`}>
      {children}
    </Link>
  );
};
