import { useCallback, useEffect, useMemo, useRef } from "react";
import { buildTagMatchIndex, findMatchingTagIds } from "../utils/letterTagMatching.js";

export default function useLetterAutoTags({ enabled, sessionKey, kind, fields, tags, setSelectedIds, onMatch }) {
  const dismissed = useRef(new Map());
  const onMatchRef = useRef(onMatch);
  const index = useMemo(() => buildTagMatchIndex(tags), [tags]);
  // Compare field values, so unrelated renders and manual tag choices do not restart the timer.
  const signature = JSON.stringify(fields);

  useEffect(() => { onMatchRef.current = onMatch; });

  useEffect(() => {
    dismissed.current.clear();
  }, [enabled, sessionKey]);

  const dismissTags = useCallback((ids) => {
    if (!dismissed.current.has(kind)) dismissed.current.set(kind, new Set());
    for (const id of ids) dismissed.current.get(kind).add(String(id));
  }, [kind]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      const matches = findMatchingTagIds(JSON.parse(signature), index)
        .filter((id) => !dismissed.current.get(kind)?.has(id));
      if (!matches.length) return;
      setSelectedIds((current) => {
        const existing = new Set(current.map(String));
        const additions = matches.filter((id) => !existing.has(id));
        return additions.length ? [...current, ...additions] : current;
      });
      onMatchRef.current?.();
    }, 1000);
    return () => clearTimeout(timer);
  }, [enabled, sessionKey, kind, signature, index, setSelectedIds]);

  return dismissTags;
}
