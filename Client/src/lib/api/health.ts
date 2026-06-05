const HEALTH_URL = import.meta.env.DEV
  ? '/health'
  : 'https://manthan-ai-69lq.onrender.com/health'

export async function checkHealth() {
  const res = await fetch(HEALTH_URL, { credentials: 'include' })
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}
