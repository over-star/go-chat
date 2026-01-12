import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        // Load user from localStorage on mount
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    const login = async (username, password) => {
        try {
            const response = await authService.login(username, password)
            if (response.data) {
                setToken(response.data.token)
                setUser(response.data.user)
                localStorage.setItem('token', response.data.token)
                localStorage.setItem('user', JSON.stringify(response.data.user))
                navigate('/chat')
                return { success: true }
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            }
        }
    }

    const register = async (username, email, password) => {
        try {
            const response = await authService.register(username, email, password)
            if (response.data) {
                setToken(response.data.token)
                setUser(response.data.user)
                localStorage.setItem('token', response.data.token)
                localStorage.setItem('user', JSON.stringify(response.data.user))
                navigate('/chat')
                return { success: true }
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Registration failed'
            }
        }
    }

    const logout = () => {
        authService.logout()
        setToken(null)
        setUser(null)
        navigate('/login')
    }

    const value = {
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        loading,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
