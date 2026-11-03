import axios from 'axios'

// Single HTTP client of the app: the auth cookie is httpOnly and sent with every request,
// MLS routes also need the id of the current device.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let current_device_id: string | null = null

export function set_api_device(Device_id: string | null) {
  current_device_id = Device_id
}

api.interceptors.request.use((config) => {
  if (current_device_id)
    config.headers['X-Device-Id'] = current_device_id
  return config
})

// Log every failed request with what the server said, or why there was no answer at all.
// A 401 only means that nobody is logged in.
api.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status !== 401) {
    const request = `${error.config?.method?.toUpperCase()} ${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`
    if (error.response)
      console.error(`API ${request} failed with ${error.response.status}:`, error.response.data)
    else
      console.error(`API ${request} got no answer: the server is down, unreachable, or refused this origin (CORS).`, error.message)
  }
  return Promise.reject(error)
})

export function is_status(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status
}

export function error_message(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data === 'string' && error.response.data)
      return error.response.data
    // No answer: "Network Error" says nothing to the user
    if (!error.response)
      return `Le serveur ne répond pas (${api.defaults.baseURL}). Les détails sont dans la console du navigateur.`
  }
  return (error as Error)?.message ?? 'Unknown error'
}
