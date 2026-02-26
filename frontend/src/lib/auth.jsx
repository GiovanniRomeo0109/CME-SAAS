import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cme_token");
    if (token) {
      api.auth.me()
        .then(setUser)
        .catch(() => localStorage.removeItem("cme_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem("cme_token", token);
    setUser(user);
  };

  const register = async (email, password, name) => {
    const { token, user } = await api.auth.register({ email, password, name });
    localStorage.setItem("cme_token", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("cme_token");
    setUser(null);
  };

  const refreshUser = () => api.auth.me().then(setUser);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
