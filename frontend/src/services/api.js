import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

export async function analyzeCode({ filename, language, code, mode = 'recommended', threshold, autoApplyConfidence }) {
  const response = await api.post('/analyze', {
    filename,
    language,
    code,
    mode,
    threshold,
    autoApplyConfidence,
  })
  return response.data
}

export default api
