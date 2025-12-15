import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../utils/api";
import { isMainAdminUser } from "../utils/auth";

const AuthCtx = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      isAdmin: false,
      login: async () => {
        throw new Error("AuthProvider is not mounted");
      },
      logout: async () => {},
      reloadMe: async () => {},
      setUser: () => {},
    };
  }
  return ctx;
}

function normalizeUser(u) {
  if (!u) return u;
  if (isMainAdminUser(u)) {
    return {
      ...u,
      role: "admin",
      can_manage_users: true,
      scopes: Array.from(new Set([...(u.scopes || []), "all"])),
    };
  }
  return u;
}

function mapAuthError(err) {
  const m = String(err?.message || err || "");
  if (m === "invalid_credentials") return "نام کاربری یا رمز عبور اشتباه است";
  if (m === "username_password_required") return "نام کاربری و رمز عبور الزامی است";
  if (m === "user_has_no_password") return "برای این کاربر رمز تعریف نشده است";
  if (m === "request_failed") return "خطا در ارتباط با سرور";
  return m || "خطای ورود";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const reloadMe = async () => {
    try {
      const r = await api("/auth/me", { method: "GET" });
      const u = normalizeUser(r?.user || null);
      setUser(u);
      try {
        if (u) localStorage.setItem("user", JSON.stringify(u));
        else localStorage.removeItem("user");
      } catch {}
      return u;
    } catch {
      setUser(null);
      try {
        localStorage.removeItem("user");
      } catch {}
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username, password) => {
    try {
      const r = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: String(username || "").trim(),
          password: String(password || "").trim(),
        }),
      });

      const u = normalizeUser(r?.user || null);
      if (!u) throw new Error("خطا در ورود");

      setUser(u);
      try {
        localStorage.setItem("user", JSON.stringify(u));
      } catch {}

      return u;
    } catch (e) {
      throw new Error(mapAuthError(e));
    }
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    try {
      localStorage.removeItem("user");
    } catch {}
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      reloadMe,
      isAdmin: isMainAdminUser(user) || user?.role === "admin",
    }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
