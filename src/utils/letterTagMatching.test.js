import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTagMatchIndex, findMatchingTagIds, normalizeTagText } from "./letterTagMatching.js";

const match = (fields, labels) => findMatchingTagIds(fields, buildTagMatchIndex(labels.map((label, id) => ({ id: id + 1, label }))));

test("finds a tag inside a longer subject, including spacing and spelling variants", () => {
  for (const subject of ["ضمانت نامه ی اداری ساختمان a", "ضمانتنامه اداری", "ضمانت‌نامه اداری", "صمانت نامه اداری", "ضامنت نامه اداری"]) {
    assert.deepEqual(match([subject], ["ضمانت نامه", "صورت وضعیت"]), ["1"], subject);
  }
});

test("normalizes Persian and Arabic characters, diacritics, digits and Latin case", () => {
  assert.equal(normalizeTagText("  كِيفِيّت آبی ۱۲٣ A  "), "کیفیت ابی 123 a");
  assert.deepEqual(match(["کيفيت ساختمان A۱۲"], ["کیفیت", "ساختمان a12"]), ["1", "2"]);
});

test("searches independent fields and all catalog entries without a 24-tag cap", () => {
  const labels = Array.from({ length: 35 }, (_, i) => `برچسب ${i}`);
  assert.equal(match(labels, labels).length, 35);
  assert.deepEqual(match(["صورت وضعیت پیمانکار", "ضمانتنامه", "واحد مالی"], ["ضمانت نامه", "واحد مالی", "صورت وضعیت"]), ["3", "1", "2"]);
  assert.deepEqual(match(["ضمانت", "نامه"], ["ضمانت نامه"]), []);
});

test("does not match short words inside other words or invent fuzzy identifiers", () => {
  assert.deepEqual(match(["برنامه کاری ۱۲۴ A13"], ["نامه", "کار", "۱۲۳", "A12"]), []);
  assert.deepEqual(match(["۱۲۳ A12"], ["۱۲۳", "a12"]), ["1", "2"]);
  assert.deepEqual(match(["درخواست خرید تجهیزات"], ["ضمانت نامه", "صورت وضعیت"]), []);
});

test("prefers exact labels over similar tags and leaves ambiguous typos to manual selection", () => {
  assert.deepEqual(match(["ضمانت نامه اداری"], ["ضمانت نامه", "ضمانت خانه"]), ["1"]);
  assert.deepEqual(match(["صمانت نامه اداری"], ["ضمانت نامه", "نامه"]), ["1", "2"]);
  assert.deepEqual(match(["ضمانت بامه"], ["ضمانت نامه", "ضمانت خامه"]), []);
  assert.deepEqual(match(["ضمانتنامه"], ["ضمانت نامه", "ضمانت‌نامه"]), ["1", "2"]);
});

test("ignores empty labels, deduplicates IDs, and retains original catalog IDs", () => {
  const index = buildTagMatchIndex([{ id: "tag-7", label: "ضمانت نامه" }, { id: 8, label: "" }, { label: "نامه" }]);
  assert.deepEqual(findMatchingTagIds([null, "", "ضمانت نامه", "صمانتنامه"], index), ["tag-7"]);
  assert.deepEqual(findMatchingTagIds(["موضوع"], buildTagMatchIndex([])), []);
});
