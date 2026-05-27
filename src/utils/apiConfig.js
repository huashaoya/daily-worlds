const DEFAULT_API_BASE_URL = 'http://localhost:3000'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')

export function toApiUrl(path) {
  if (!path) return API_BASE_URL
  if (/^https?:\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
