import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'

function App() {
    return (
        <Router>
            <AuthProvider>
                <WebSocketProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/" element={<Navigate to="/chat" replace />} />
                    </Routes>
                </WebSocketProvider>
            </AuthProvider>
        </Router>
    )
}

export default App
