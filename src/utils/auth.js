// src/utils/auth.js
export function isMainAdminUser(u) {
  if (!u) return false;

  const email = String(u.email || "").toLowerCase().trim();
  const uname = String(u.username || "").toLowerCase().trim();

  if (email === "marandi@ipecgroup.net" || uname === "marandi") return true;

  return (
    u.role === "admin" ||
    u.can_manage_users === true ||
    (Array.isArray(u.scopes) && u.scopes.includes("all"))
  );
}
