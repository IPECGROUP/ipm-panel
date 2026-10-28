import { useRef, useState } from "react";
import { ArcaptchaWidget } from "arcaptcha-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { api } from "../utils/api.js";
import { useAuth } from "../components/AuthProvider.jsx";
import "./ModernLogin.css";
import { captchaSiteKeyForHostname } from "../utils/captcha.js";

export default function ModernLogin({ onBack, testMode = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const captchaRef = useRef(null);
  const submittingRef = useRef(false);
  const siteKey = captchaSiteKeyForHostname(window.location.hostname, {
    external: import.meta.env.VITE_ARCAPTCHA_SITE_KEY,
    internal: import.meta.env.VITE_ARCAPTCHA_SITE_KEY_INTERNAL,
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");
    setSuccess(false);
    if (!siteKey || !captchaToken) {
      setError(siteKey ? "\u0644\u0637\u0641\u0627\u064b \u06a9\u067e\u0686\u0627 \u0631\u0627 \u062a\u06a9\u0645\u06cc\u0644 \u06a9\u0646\u06cc\u062f." : "\u0633\u0631\u0648\u06cc\u0633 \u06a9\u067e\u0686\u0627 \u062a\u0646\u0638\u06cc\u0645 \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (testMode) {
        await api("/auth/test-login", { method: "POST", body: JSON.stringify({ username: username.trim(), password: password.trim(), captchaToken }) });
        setSuccess(true);
        setCaptchaToken("");
        captchaRef.current?.resetCaptcha();
      } else {
        await login(username.trim(), password.trim(), captchaToken);
        navigate(location.state?.from?.pathname || "/", { replace: true });
      }
    } catch (cause) {
      setCaptchaToken("");
      captchaRef.current?.resetCaptcha();
      setError(cause?.message || "ورود انجام نشد. دوباره تلاش کنید.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="modern-login" dir="rtl">
      <svg className="modern-login__filters" aria-hidden="true" focusable="false">
        <defs>
          <filter id="modern-login-refraction" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="1" seed="4" result="glass-noise" />
            <feGaussianBlur in="glass-noise" stdDeviation="2" result="soft-noise" />
            <feDisplacementMap in="SourceGraphic" in2="soft-noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <button className="modern-login__back" type="button" onClick={onBack || (() => navigate("/login"))}>
        بازگشت به طراحی قبلی
      </button>

      <div className="modern-login__content">
        <header className="modern-login__brand">
          <div className="modern-login__mark">
            <img src="/images/png%20%D9%84%D9%88%DA%AF%D9%88-12.png" alt="نشان PEC" />
          </div>
          <h2>سامانه فرآیندهای یکپارچه (IPS)</h2>
        </header>

        <section className="modern-login__panel" aria-labelledby="modern-login-title">
          <h1 id="modern-login-title">ورود</h1>

          <form onSubmit={submit} className="modern-login__form">
            <label className="modern-login__field">
              <UserRound aria-hidden="true" size={24} strokeWidth={1.8} />
              <span className="sr-only">نام کاربری</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                required
                dir="rtl"
                placeholder="نام کاربری"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label className="modern-login__field">
              <LockKeyhole aria-hidden="true" size={24} strokeWidth={1.8} />
              <span className="sr-only">رمز عبور</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                dir="rtl"
                placeholder="رمز عبور"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="modern-login__visibility"
                aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={23} /> : <Eye size={23} />}
              </button>
            </label>

            <div className="modern-login__captcha">
              {siteKey ? <ArcaptchaWidget ref={captchaRef} site-key={siteKey} callback={(token) => { setCaptchaToken(token || ""); if (token) setError(""); }} expired_callback={() => setCaptchaToken("")} script_loading_failed_callback={() => setError("بارگذاری کپچا انجام نشد.")} /> : "کلید کپچا تنظیم نشده است."}
            </div>
            {success && <p className="modern-login__success" role="status">{"\u0648\u0631\u0648\u062f \u062a\u0633\u062a\u06cc \u0648 \u0627\u0639\u062a\u0628\u0627\u0631\u0633\u0646\u062c\u06cc \u06a9\u067e\u0686\u0627 \u0645\u0648\u0641\u0642 \u0628\u0648\u062f."}</p>}

            {error && <p className="modern-login__error" role="alert">{error}</p>}

            <button className="modern-login__submit" type="submit" disabled={submitting}>
              {submitting ? "در حال ورود…" : "ورود"}
            </button>
          </form>
          <p className="modern-login__help">اگر حساب ندارید، با ادمین تماس بگیرید.</p>
        </section>
        <p className="modern-login__version">نسخه: <span dir="ltr">v2.0.0</span></p>
      </div>
    </main>
  );
}
