import React from "react";

const ICONS = {
  edit: "/images/icons/pencil.svg",
  delete: "/images/icons/hazf.svg",
  save: "/images/icons/check.svg",
  cancel: "/images/icons/bastan.svg",
};

export default function RowActionIconBtn({
  action, // 'edit' | 'delete' | 'save' | 'cancel'
  icon, // اگر action نباشه یا بخوای override کنی
  title,
  onClick,
  disabled,

  size = 36, // اندازه دکمه (کوچیک‌تر از قبلی)
  iconSize = 16, // اندازه آیکن (پایه)
  variant, // 'default' | 'danger' | 'neutral' (اختیاری)
  className = "",
  imgClassName = "",
  imgStyle,
}) {
  const src = icon || (action ? ICONS[action] : "");
  const autoVariant =
    action === "delete" ? "danger" : action === "cancel" ? "danger" : "default";
  const finalVariant = variant || autoVariant;

  const baseBtn =
    "inline-grid place-items-center rounded-xl !bg-transparent !bg-none !ring-0 !border-0 !shadow-none " +
    "hover:!bg-transparent active:!bg-transparent focus:!bg-transparent " +
    "hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed";

  const dangerFilter =
    "brightness(0) saturate(100%) invert(17%) sepia(96%) saturate(5345%) hue-rotate(353deg) brightness(97%) contrast(115%)";

  const finalTitle =
    title ||
    (action === "edit"
      ? "ویرایش"
      : action === "delete"
      ? "حذف"
      : action === "save"
      ? "ذخیره"
      : action === "cancel"
      ? "انصراف"
      : "");

  const finalIconSize =
    action === "edit"
      ? iconSize + 2
      : action === "cancel"
      ? Math.max(10, iconSize - 2)
      : iconSize;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={finalTitle}
      aria-label={finalTitle}
      className={`${baseBtn} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt=""
        className={`${imgClassName} ${
          finalVariant === "default" ? "dark:invert" : ""
        }`}
        style={{
          width: finalIconSize,
          height: finalIconSize,
          ...(finalVariant === "danger" ? { filter: dangerFilter } : {}),
          ...(imgStyle || {}),
        }}
      />
    </button>
  );
}
