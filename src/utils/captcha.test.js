import { test } from "node:test";
import assert from "node:assert/strict";
import { captchaSiteKeyForHostname } from "./captcha.js";

test("only the exact supported hostname selects its corresponding public key", () => {
  const keys = { external: "external", internal: "internal" };
  assert.equal(captchaSiteKeyForHostname("ips.ipecgroup.net", keys), "external");
  assert.equal(captchaSiteKeyForHostname("ips.ipec.com", keys), "internal");
  assert.equal(captchaSiteKeyForHostname("ips.ipec.com.evil.example", keys), "");
  assert.equal(captchaSiteKeyForHostname("localhost", keys), "");
  assert.equal(captchaSiteKeyForHostname("ips.ipec.com", { ...keys, internal: " " }), "");
});
