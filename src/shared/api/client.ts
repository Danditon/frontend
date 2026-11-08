import axios from 'axios'

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '/api'

export const apiClient = axios.create({
  baseURL: configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api`,
})
