import { useState, useRef, useEffect } from 'react'
import { messageService } from '../services/messageService'
import { Send, Paperclip, Image as ImageIcon, Smile, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react'

function MessageInput({ onSend, roomMembers }) {
    const [message, setMessage] = useState('')
    const [uploading, setUploading] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const fileInputRef = useRef(null)
    const imageInputRef = useRef(null)
    const emojiPickerRef = useRef(null)
    const emojiButtonRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
                setShowEmojiPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const onEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (message.trim()) {
            onSend(message, 'text')
            setMessage('')
        }
    }

    const handleFileUpload = async (e, type = 'file') => {
        const file = e.target.files?.[0]
        if (!file) return

        // Limit file size to 4MB (matching backend)
        const MAX_SIZE = 4 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            alert('文件大小不能超过4MB')
            if (fileInputRef.current) fileInputRef.current.value = ''
            if (imageInputRef.current) imageInputRef.current.value = ''
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        try {
            setUploading(true)
            const response = await messageService.uploadFile(formData)

            if (response.data) {
                const fileType = type === 'image' || file.type.startsWith('image/') ? 'image' : 'file'
                onSend(message || '', fileType, {
                    url: response.data.file_url,
                    name: response.data.file_name,
                    size: response.data.file_size
                })
                setMessage('')
            }
        } catch (error) {
            console.error('Upload failed:', error)
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
            if (imageInputRef.current) {
                imageInputRef.current.value = ''
            }
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <div className="border-t bg-card p-2 md:p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-1 md:gap-2">
                <input
                    ref={imageInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    accept="image/*"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'file')}
                    className="hidden"
                />

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    title="发送图片"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ImageIcon className="h-5 w-5" />
                    )}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="发送文件"
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <div className="flex-1 relative">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息..."
                        className="pr-20"
                        disabled={uploading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <Button
                            ref={emojiButtonRef}
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            title="添加表情"
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                    </div>

                    {showEmojiPicker && (
                        <div
                            ref={emojiPickerRef}
                            className="absolute bottom-full right-0 mb-2 z-50 max-w-[calc(100vw-2rem)]"
                        >
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                autoFocusSearch={false}
                                theme={Theme.AUTO}
                                emojiStyle={EmojiStyle.NATIVE}
                                width={window.innerWidth < 400 ? window.innerWidth - 32 : 350}
                                height={window.innerWidth < 400 ? 300 : 400}
                                searchPlaceHolder="搜索表情..."
                                previewConfig={{
                                    showPreview: false
                                }}
                            />
                        </div>
                    )}
                </div>

                <Button type="submit" size="icon" disabled={!message.trim() || uploading}>
                    <Send className="h-5 w-5" />
                </Button>
            </form>
        </div>
    )
}

export default MessageInput
