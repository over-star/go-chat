import { File, Image as ImageIcon, Check, CheckCheck, Download } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'
import { useState } from 'react'

function Message({ message, isOwn, roomMembers }) {
    const [imageError, setImageError] = useState(false)

    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        if (isNaN(date.getTime())) return ''
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const hasBeenRead = message.read_by && message.read_by.length > 0

    return (
        <div className={cn("flex gap-3 mb-4", isOwn && "flex-row-reverse")}>
            <Avatar className="h-9 w-9 mt-1 flex-shrink-0">
                <AvatarImage src={message.sender?.avatar} />
                <AvatarFallback className={cn(isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {message.sender?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col max-w-[75%]", isOwn && "items-end")}>
                <span className="text-xs font-medium text-muted-foreground mb-1 px-1">
                    {message.sender?.nickname || message.sender?.username}
                </span>

                <div
                    className={cn(
                        "rounded-2xl px-4 py-2 break-words",
                        isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                    )}
                >
                    {message.type === 'text' && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}

                    {message.type === 'image' && (
                        <div className="space-y-2">
                            {!imageError ? (
                                <img
                                    src={`${message.file_url}`}
                                    alt={message.file_name || 'Image'}
                                    className="max-w-full sm:max-w-[400px] max-h-[300px] w-auto h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain block"
                                    onError={() => setImageError(true)}
                                    onClick={() => window.open(`${message.file_url}`, '_blank')}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-background/20 rounded-lg">
                                    <ImageIcon className="h-8 w-8" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">图片不可用</p>
                                        <p className="text-xs opacity-70">{message.file_name}</p>
                                    </div>
                                </div>
                            )}
                            {message.content && (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                        </div>
                    )}

                    {message.type === 'file' && (
                        <div className="flex items-center gap-3 min-w-[250px]">
                            <div className={cn(
                                "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                                isOwn ? "bg-primary-foreground/20" : "bg-background/50"
                            )}>
                                <File className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" title={message.file_name}>
                                    {message.file_name}
                                </p>
                                <p className="text-xs opacity-70">
                                    {formatFileSize(message.file_size)}
                                </p>
                            </div>
                            <a
                                href={`${message.file_url}`}
                                download={message.file_name}
                                className={cn(
                                    "flex items-center justify-center h-8 w-8 rounded-full transition-colors flex-shrink-0",
                                    isOwn
                                        ? "hover:bg-primary-foreground/20"
                                        : "hover:bg-background/50"
                                )}
                                onClick={(e) => e.stopPropagation()}
                                title="下载文件"
                            >
                                <Download className="h-4 w-4" />
                            </a>
                        </div>
                    )}
                </div>

                <div className={cn("flex items-center gap-1 mt-1 px-1", isOwn && "flex-row-reverse")}>
                    <span className="text-xs text-muted-foreground">
                        {formatTime(message.created_at)}
                    </span>
                    {isOwn && (
                        <span>
                            {hasBeenRead ? (
                                <CheckCheck className="h-3 w-3 text-primary" />
                            ) : (
                                <Check className="h-3 w-3 text-muted-foreground" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Message
