import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
})

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
