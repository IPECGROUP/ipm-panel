import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "../components/AuthProvider.jsx";
import "./ModernLogin.css";

export default function ModernLogin({ onBack }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password.trim());
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (cause) {
      setError(cause?.message || "ورود انجام نشد. دوباره تلاش کنید.");
    } finally {
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
      <button className="modern-login__back" type="button" onClick={onBack}>
        بازگشت به طراحی قبلی
      </button>

      <div className="modern-login__content">
        <header className="modern-login__brand">
          <div className="modern-login__mark">
            <img src="/images/ips%20redesign%20logo.png" alt="نشان PEC" />
          </div>
          <h2>سامانه فرآیندهای یکپارچه (IPS)</h2>
          <p>شرکت ایده‌پردازان انرژی</p>
        </header>

        <section className="modern-login__panel" aria-labelledby="modern-login-title">
          <h1 id="modern-login-title">ورود به سامانه</h1>
          <p className="modern-login__subtitle">سامانه فرآیندهای یکپارچه</p>

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

            <div className="modern-login__captcha" role="status">
              کپچا نیازمند اتصال سرویس و اعتبارسنجی سمت سرور است.
            </div>

            {error && <p className="modern-login__error" role="alert">{error}</p>}

            <button className="modern-login__submit" type="submit" disabled={submitting}>
              {submitting ? "در حال ورود…" : "ورود به سامانه"}
              {!submitting && <ArrowLeft aria-hidden="true" size={25} />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
