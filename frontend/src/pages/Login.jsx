import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MessageCircle, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'

function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        await login(username, password)
        // No need to check result.success to set error, global handler does it
        // If success, AuthContext navigates away

        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl">欢迎回来</CardTitle>
                        <CardDescription>登录以继续聊天</CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="username">用户名或邮箱</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="输入用户名"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">密码</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="输入密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    登录中...
                                </>
                            ) : (
                                '登录'
                            )}
                        </Button>
                    </CardContent>

                    <CardFooter className="flex-col space-y-2">
                        <div className="text-sm text-muted-foreground">
                            没有账号？{' '}
                            <Link to="/register" className="text-primary hover:underline font-medium">
                                立即注册
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

export default Login
