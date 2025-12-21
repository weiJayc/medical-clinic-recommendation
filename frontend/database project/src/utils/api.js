const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = isJson ? data?.message ?? res.statusText : res.statusText;
    throw new Error(message);
  }
  return data;
}

export function postJson(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export function getJson(path) {
  return request(path, { method: "GET" });
}
