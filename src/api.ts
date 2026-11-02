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

export function is_status(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status
}

export function error_message(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data === 'string' && error.response.data)
    return error.response.data
  return (error as Error)?.message ?? 'Unknown error'
}
