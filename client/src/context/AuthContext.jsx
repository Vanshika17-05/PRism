import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(Boolean(localStorage.getItem("prism_token")));
  useEffect(() => { if (!localStorage.getItem("prism_token")) return; api.get("/api/auth/me").then(({ data }) => setUser(data.user)).catch(() => localStorage.removeItem("prism_token")).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ user, loading, async login(credentials) { const { data } = await api.post("/api/auth/login", credentials); localStorage.setItem("prism_token", data.token); setUser(data.user); }, async register(input) { const { data } = await api.post("/api/auth/register", input); localStorage.setItem("prism_token", data.token); setUser(data.user); }, async logout() { try { await api.post("/api/auth/logout"); } finally { localStorage.removeItem("prism_token"); setUser(null); } } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
