import React, {
  createContext,
  useContext,
  useState,
} from "react";

/** تشخیص ادمین اصلی (مثل پروژه قبلی) */
export function isMainAdminUser(u) {
  if (!u) return false;
  const email = String(u.email || "").toLowerCase().trim();
  const uname = String(u.username || "").toLowerCase().trim();
  if (email === "marandi@ipecgroup.net" || uname === "marandi") return true;
  return (
    u.role === "admin" ||
    u.can_manage_users === true ||
    (u.scopes || []).includes("all")
  );
}

const AuthCtx = createContext(null);

/** هوک استفاده از auth – اگر Provider نبود، کرش نمی‌کنه */
export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    return {
      user: null,
      setUser: () => {},
      login: async () => {
        throw new Error("AuthProvider is not mounted");
      },
      logout: () => {},
    };
  }
  return ctx;
}

export function AuthProvider({ children }) {
  const normalizeUser = (u) => {
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
  };

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  });

  const login = async (username, password) => {
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "").trim();

    // ✅ فقط همین یک اکانت فعلاً
    if (u === "marandi" && p === "1234") {
      const fakeUser = normalizeUser({
        id: 1,
        username: "marandi",
        email: "marandi@ipecgroup.net",
        name: "مهندس مرندی",
        role: "admin",
        can_manage_users: true,
        scopes: ["all"],
      });

      localStorage.removeItem("token");
      localStorage.setItem("user", JSON.stringify(fakeUser));
      setUser(fakeUser);
      return;
    }

    throw new Error("نام کاربری یا رمز عبور اشتباه است");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
