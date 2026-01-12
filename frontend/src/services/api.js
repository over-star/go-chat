import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

import errorHandler from '../utils/errorHandler'

/* ... existing code ... */

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized globally
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')

            // Only redirect if not already on auth pages
            if (!window.location.pathname.includes('/login') &&
                !window.location.pathname.includes('/register')) {
                errorHandler.error(error, 'Session expired. Please log in again.')
                window.location.href = '/login'
            }
        }

        // Let component handle specific errors if needed, otherwise global handler catches it
        // We reject the promise so components can do custom handling if they want
        // But we attach a flag indicating if it was already handled globally (optional logic)

        return Promise.reject(error)
    }
)

export default api
