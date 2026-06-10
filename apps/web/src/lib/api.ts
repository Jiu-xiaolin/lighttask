let _token = "";
let _on401: (() => void) | null = null;
let _fired401 = false; // prevent duplicate 401 callbacks

export function setApiToken(token: string) { _token = token; }
export function getApiToken() { return localStorage.getItem("lt_token") || _token; }
export function on401(fn: () => void) { _on401 = fn; }

export async function api(path: string, options: RequestInit = {}) {
  // Always read from localStorage first — no timing dependency
  const token = localStorage.getItem("lt_token") || _token;
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (response.status === 401) {
    console.warn("[api] 401 for", path, "message:", data?.message);
    if (_on401 && !_fired401) {
      _fired401 = true;
      _on401();
      // Reset after a delay so subsequent 401s during redirect work
      setTimeout(() => { _fired401 = false; }, 3000);
    }
    throw new Error(data?.message || "请重新登录");
  }
  if (!response.ok) throw new Error(data?.message || "请求失败");
  return data;
}
