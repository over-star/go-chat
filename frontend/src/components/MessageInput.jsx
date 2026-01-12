import { useState, useRef } from 'react'
import { messageService } from '../services/messageService'
import { Send, Paperclip, Image as ImageIcon, Smile, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'

function MessageInput({ onSend, roomMembers }) {
    const [message, setMessage] = useState('')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (message.trim()) {
            onSend(message, 'text')
            setMessage('')
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            setUploading(true)
            const response = await messageService.uploadFile(formData)

            if (response.data) {
                const fileType = file.type.startsWith('image/') ? 'image' : 'file'
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
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <div className="border-t bg-card p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,application/*"
                />

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Paperclip className="h-5 w-5" />
                    )}
                </Button>

                <div className="flex-1 relative">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="pr-10"
                        disabled={uploading}
                    />
                </div>

                <Button type="submit" size="icon" disabled={!message.trim() || uploading}>
                    <Send className="h-5 w-5" />
                </Button>
            </form>
        </div>
    )
}

export default MessageInput
