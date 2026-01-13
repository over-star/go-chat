import { useState, useRef } from 'react'
import { userService } from '../services/userService'
import { messageService } from '../services/messageService'
import { useAuth } from '../context/AuthContext'
import errorHandler from '../utils/errorHandler'
import { X, Loader2, Camera, User, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function ProfileModal({ onClose }) {
    const { user, updateUser } = useAuth()
    const [nickname, setNickname] = useState(user?.nickname || '')
    const [avatar, setAvatar] = useState(user?.avatar || '')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 4MB check
        if (file.size > 4 * 1024 * 1024) {
            errorHandler.error(null, '图片大小不能超过 4MB')
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        try {
            setUploading(true)
            const response = await messageService.uploadFile(formData)
            if (response.data?.file_url) {
                setAvatar(response.data.file_url)
                errorHandler.success('图片上传成功')
            }
        } catch (error) {
            // Error handled globally
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            await userService.updateProfile({ nickname, avatar })
            updateUser({ nickname, avatar })
            errorHandler.success('资料更新成功')
            onClose()
        } catch (error) {
            // Error handled globally
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border rounded-lg shadow-lg overflow-hidden animate-in zoom-in duration-200">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-lg">修改个人资料</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div 
                            className="relative group cursor-pointer"
                            onClick={handleAvatarClick}
                        >
                            <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                                <AvatarImage src={avatar} />
                                <AvatarFallback className="text-3xl bg-primary/10">
                                    {user?.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploading ? (
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-8 w-8 text-white" />
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">点击头像上传图片 (最大 4MB)</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">用户名 (不可修改)</Label>
                            <Input
                                id="username"
                                value={user?.username}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nickname">昵称</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="nickname"
                                    placeholder="输入您的昵称"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avatar">头像 URL</Label>
                            <Input
                                id="avatar"
                                placeholder="输入头像图片地址"
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            取消
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            保存修改
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ProfileModal
