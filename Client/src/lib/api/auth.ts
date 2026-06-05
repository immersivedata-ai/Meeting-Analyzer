import { apiFetch } from './client'

export interface User {
  id: string
  name: string
  email: string
}

export async function fetchMe(): Promise<{ user: User }> {
  return apiFetch('/auth/me')
}

export async function loginUser(email: string, password: string): Promise<{ user: User }> {
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function registerUser(name: string, email: string, password: string): Promise<{ user: User }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}
