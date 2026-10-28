export function captchaSiteKeyForHostname(hostname, keys) {
  const key = hostname === "ips.ipecgroup.net" ? keys.external
    : hostname === "ips.ipec.com" ? keys.internal : "";
  return typeof key === "string" ? key.trim() : "";
}
