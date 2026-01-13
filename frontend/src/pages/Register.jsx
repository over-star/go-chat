import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MessageCircle, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import errorHandler from '../utils/errorHandler'

function Register() {
    const [username, setUsername] = useState('')
    const [nickname, setNickname] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            errorHandler.error(null, '两次输入的密码不一致', { id: 'validation-pwd' })
            return
        }

        if (password.length < 6) {
            errorHandler.error(null, '密码长度至少为 6 位', { id: 'validation-len' })
            return
        }

        setLoading(true)
        await register(username, nickname, email, password)
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
                        <CardTitle className="text-3xl">创建账号</CardTitle>
                        <CardDescription>加入我们并开始聊天</CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="username">用户名</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="选择用户名"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nickname">昵称</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="nickname"
                                    type="text"
                                    placeholder="输入昵称"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    required
                                    minLength={2}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">邮箱</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="输入邮箱"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    placeholder="创建密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">确认密码</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="再次输入密码"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    创建账号中...
                                </>
                            ) : (
                                '创建账号'
                            )}
                        </Button>
                    </CardContent>

                    <CardFooter className="flex-col space-y-2">
                        <div className="text-sm text-muted-foreground">
                            已有账号？{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                立即登录
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

export default Register
