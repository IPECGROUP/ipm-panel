const LIMITED_USERNAMES = new Set(["maali", "chamanara"]);

export function hasLimitedPageAccess(user) {
  const username = String(user?.username || "").trim().toLowerCase();
  return LIMITED_USERNAMES.has(username);
}

export function canOpenPage(user, pathname) {
  if (!hasLimitedPageAccess(user)) return true;

  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  return [
    "/",
    "/dashboard",
    "/requests",
    "/payment",
    "/finance/payment-request",
    "/finance/tenkhah",
    "/supply/request",
    "/supply/actions",
  ].includes(path) || path.startsWith("/requests/");
}
