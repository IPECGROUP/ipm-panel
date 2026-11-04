// Normalize spelling and spacing without changing the saved label.
export function normalizeTagText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function typoBudget(label) {
  // Short labels and identifiers require an exact match to avoid noisy additions.
  if (label.length < 6 || !/^\p{L}+$/u.test(label)) return 0;
  return label.length >= 12 ? 2 : 1;
}

export function buildTagMatchIndex(tags) {
  const byLength = new Map();
  let maxLength = 0;
  for (const tag of tags) {
    const id = String(tag?.id ?? "").trim();
    const label = normalizeTagText(tag?.label ?? tag?.name ?? tag?.title ?? tag?.text ?? tag?.tag).replaceAll(" ", "");
    if (!id || !label) continue;
    const entry = { id, label, budget: typoBudget(label) };
    if (!byLength.has(label.length)) byLength.set(label.length, []);
    byLength.get(label.length).push(entry);
    maxLength = Math.max(maxLength, label.length + entry.budget);
  }
  return { byLength, maxLength };
}

// Bounded Damerau-Levenshtein distance also accepts adjacent transposed letters.
function editDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  let beforePrevious;
  for (let i = 1; i <= left.length; i += 1) {
    const row = [i];
    let minimum = i;
    for (let j = 1; j <= right.length; j += 1) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
      }
      minimum = Math.min(minimum, row[j]);
    }
    if (minimum > limit) return limit + 1;
    beforePrevious = previous;
    previous = row;
  }
  return previous[right.length];
}

export function findMatchingTagIds(fields, index) {
  const ids = new Set();
  for (const field of fields) {
    const words = normalizeTagText(field).split(" ").filter(Boolean);
    const matches = [];
    for (let start = 0; start < words.length; start += 1) {
      let phrase = "";
      for (let end = start; end < words.length; end += 1) {
        phrase += words[end];
        if (phrase.length > index.maxLength) break;
        let bestDistance = Infinity;
        let best = [];
        for (let length = Math.max(1, phrase.length - 2); length <= phrase.length + 2; length += 1) {
          for (const entry of index.byLength.get(length) || []) {
            if (Math.abs(length - phrase.length) > entry.budget) continue;
            const distance = phrase === entry.label ? 0 : entry.budget ? editDistance(phrase, entry.label, entry.budget) : 1;
            if (distance > entry.budget || distance > bestDistance) continue;
            if (distance < bestDistance) { best = []; bestDistance = distance; }
            best.push(entry);
          }
        }
        if (best.length) matches.push({ start, end, distance: bestDistance, entries: best });
      }
    }
    const exact = matches.filter((match) => match.distance === 0);
    for (const match of matches) {
      if (match.distance && exact.some((other) => other.start <= match.start && other.end >= match.end)) continue;
      // Equally close, differently named tags are ambiguous; let the user choose.
      if (match.distance && new Set(match.entries.map((entry) => entry.label)).size > 1) continue;
      for (const entry of match.entries) ids.add(entry.id);
    }
  }
  return [...ids];
}
