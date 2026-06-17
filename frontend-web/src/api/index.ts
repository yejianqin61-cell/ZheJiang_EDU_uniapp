import axios, { type AxiosInstance } from 'axios'
import { ElMessage } from 'element-plus'

type ApiClient = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete'> & {
  get<T = any>(...args: Parameters<AxiosInstance['get']>): Promise<T>
  post<T = any>(...args: Parameters<AxiosInstance['post']>): Promise<T>
  put<T = any>(...args: Parameters<AxiosInstance['put']>): Promise<T>
  delete<T = any>(...args: Parameters<AxiosInstance['delete']>): Promise<T>
}

const api = axios.create({
  baseURL: '/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
}) as ApiClient

// ==================== 请求拦截器：注入 Token ====================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ==================== 响应拦截器：统一错误处理 ====================
api.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body === 'object' && body.code !== undefined) {
      if (body.code !== 0) {
        ElMessage.error(body.message || '请求失败')
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      return body.data !== undefined ? body.data : body
    }
    return body
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
      return Promise.reject(err)
    }
    const msg = err.response?.data?.message || err.message || '网络错误'
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default api
