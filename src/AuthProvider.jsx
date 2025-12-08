// src/AuthProvider.jsx
import React, {
  createContext,
  useContext,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./utils/api";
import { isMainAdminUser } from "./utils/auth";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    return normalizeUser(u);
  });

  const login = async (username, password) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    const data = await api("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: String(username || "").trim(),
        password: String(password || "").trim(),
      }),
    });

    const normalized = normalizeUser(data.user);
    localStorage.setItem("user", JSON.stringify(normalized));
    setUser(normalized);
  };

  const logout = async () => {
    // فعلاً فقط لوکال رو خالی می‌کنیم؛ بعداً اگر سشن سروری داشتیم اینجا صدا می‌زنیم
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

// همان PrivateRoute قدیمی
export function PrivateRoute({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export default AuthProvider;
