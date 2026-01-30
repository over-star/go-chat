import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/toaster'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import MainLayout from './components/MainLayout'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }

    return children
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <WebSocketProvider>
                    <TooltipProvider>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route
                                path="/chat/*"
                                element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Chat />
                                        </MainLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Dashboard />
                                        </MainLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                        <Toaster />
                    </TooltipProvider>
                </WebSocketProvider>
            </AuthProvider>
        </Router>
    )
}

export default App
