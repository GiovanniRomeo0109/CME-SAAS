const BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("cme_token");
}

async function req(method, path, body, isFormData = false) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: "Risposta non valida" }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth
export const api = {
  auth: {
    register: (d) => req("POST", "/auth/register", d),
    login: (d) => req("POST", "/auth/login", d),
    me: () => req("GET", "/auth/me"),
    update: (d) => req("PUT", "/auth/me", d),
  },
  ai: {
    analizza: (fd) => req("POST", "/ai/analizza", fd, true),
  },
  computi: {
    list: () => req("GET", "/computi"),
    get: (id) => req("GET", `/computi/${id}`),
    save: (d) => req("POST", "/computi", d),
    update: (id, d) => req("PUT", `/computi/${id}`, d),
    delete: (id) => req("DELETE", `/computi/${id}`),
  },
  stripe: {
    checkout: (plan) => req("POST", "/stripe/checkout", { plan }),
    portal: () => req("POST", "/stripe/portal"),
  },
};
