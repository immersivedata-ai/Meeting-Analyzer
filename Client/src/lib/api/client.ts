const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://manthan-ai-69lq.onrender.com/api'
    : 'http://localhost:8000/api')

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `Request failed (${res.status})`)
  }
  return res.json()
}
