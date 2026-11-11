import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Loading failure is isolated from the login form.
export default forwardRef(function CaptchaWidget({ onToken }, ref) {
  const widget = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [generation, setGeneration] = useState(0);
  const enabled = import.meta.env.VITE_CAPTCHA_WIDGET_ENABLED === "true";
  useImperativeHandle(ref, () => ({ reset() { onToken(""); setGeneration((n) => n + 1); } }), [onToken]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    import("altcha").then(() => { if (active) setLoaded(true); }).catch(() => {});
    return () => { active = false; };
  }, [enabled]);
  useEffect(() => {
    const el = widget.current;
    if (!el) return;
    const update = (event) => onToken(event.detail?.state === "verified" ? event.detail.payload || "" : "");
    el.addEventListener("statechange", update);
    return () => el.removeEventListener("statechange", update);
  }, [loaded, generation, onToken]);
  if (!enabled || !loaded) return null;
  const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
  return <altcha-widget key={generation} ref={widget} challenge={`${base}/captcha/challenge`} auto="off" />;
});
