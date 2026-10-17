import axios from 'axios'

// Determine the API base URL:
// 1. In production on Vercel, set VITE_API_URL (e.g. https://codecomment-backend.onrender.com)
// 2. In local development or proxy mode, defaults to '/api' (proxied by Vite)
const rawUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const apiBase = rawUrl ? (rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`) : '/api'

const api = axios.create({
  baseURL: apiBase,
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
})

export async function checkServerHealth() {
  try {
    const healthUrl = rawUrl ? `${rawUrl}/health` : '/health'
    const res = await axios.get(healthUrl, { timeout: 8000 })
    return { ok: true, data: res.data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function analyzeCode({
  filename,
  language,
  code,
  mode = 'recommended',
  threshold,
  autoApplyConfidence,
  apiKey,
  baseURL,
  model,
}) {
  const response = await api.post('/analyze', {
    filename,
    language,
    code,
    mode,
    threshold,
    autoApplyConfidence,
    apiKey,
    baseURL,
    model,
  })
  return response.data
}

export default api

