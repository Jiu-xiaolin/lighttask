let _token = "";

export function setApiToken(token: string) { _token = token; }

export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "content-type": "application/json", authorization: `Bearer ${_token}`, ...(options.headers || {}) }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || "请求失败");
  return data;
}
