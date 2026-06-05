import { apiFetch } from './client'

const HEALTH_URL = import.meta.env.DEV
  ? 'http://localhost:8000/health'
  : 'https://manthan-ai-69lq.onrender.com/health'

export async function checkHealth() {
  return apiFetch(HEALTH_URL)
}
