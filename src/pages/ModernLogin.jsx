import { useRef, useState } from "react";
import CaptchaWidget from "../components/CaptchaWidget.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Glass } from "glisse";
import { api } from "../utils/api.js";
import { useAuth } from "../components/AuthProvider.jsx";
import "./ModernLogin.css";

export default function ModernLogin({ testMode = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const captchaRef = useRef(null);
  const submittingRef = useRef(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");
    setSuccess(false);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (testMode) {
        await api("/auth/test-login", { method: "POST", body: JSON.stringify({ username: username.trim(), password: password.trim(), captchaToken }) });
        setSuccess(true);
        setCaptchaToken("");
        captchaRef.current?.reset?.();
      } else {
        await login(username.trim(), password.trim(), captchaToken, remember);
        navigate(location.state?.from?.pathname || "/", { replace: true });
      }
    } catch (cause) {
      setCaptchaToken("");
      captchaRef.current?.reset?.();
      setError(cause?.message || "ورود انجام نشد. دوباره تلاش کنید.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="modern-login" dir="rtl">
      <div className="modern-login__content">
        <header className="modern-login__brand">
          <div className="modern-login__mark"><img src="/images/png%20%D9%84%D9%88%DA%AF%D9%88-12.png" alt="IPEC" /></div>
        </header>

        <section className="modern-login__panel" aria-labelledby="modern-login-title">
          <Glass className="modern-login__glass" aria-hidden="true" />
          <h1 id="modern-login-title">سامانه فرآیندهای یکپارچه (IPS)</h1><div className="modern-login__accent" aria-hidden="true" />

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
              <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />
            </div>
            <label className="modern-login__remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>مرا به خاطر بسپار</span></label>
            {success && <p className="modern-login__success" role="status">{"\u0648\u0631\u0648\u062f \u062a\u0633\u062a\u06cc \u0645\u0648\u0641\u0642 \u0628\u0648\u062f."}</p>}

            {error && <p className="modern-login__error" role="alert">{error}</p>}

            <button className="modern-login__submit" type="submit" disabled={submitting}>
              {submitting ? "در حال ورود…" : "ورود"}
            </button>
          </form>
        </section>
        <footer className="modern-login__footer"><p>2026 {"\u00a9"} تمامی حقوق متعلق به شرکت ایده پویان انرژی می باشد.</p><p className="modern-login__version">نسخه: <span dir="ltr">v2.0.0</span></p></footer>
      </div>
    </main>
  );
}
