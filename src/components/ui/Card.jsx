// src/components/ui/Card.jsx
import React from "react";

function Card({ className = "", children, ...rest }) {
  return (
    <div
      {...rest}
      className={
        // پایه کارت با استایل Fusion
        "rounded-3xl border bg-white text-neutral-900 border-black/10 " +
        "dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 " +
        "p-4 shadow-[0_8px_40px_rgba(0,0,0,0.15)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export default Card;
export { Card };
