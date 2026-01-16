import { File, Image as ImageIcon, Check, CheckCheck, Download, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'
import { useState, useEffect } from 'react'

function Message({ message, isOwn, roomMembers, readStatus, isGroup }) {
    const [imageError, setImageError] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setIsPreviewOpen(false)
        }
        if (isPreviewOpen) {
            window.addEventListener('keydown', handleEsc)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            window.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = 'unset'
        }
    }, [isPreviewOpen])

    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        if (isNaN(date.getTime())) return ''
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    // Determine how many people have read this message
    const readers = isOwn ? (readStatus || []).filter(r => r.user_id !== message.sender?.id && r.last_read_message_id >= message.id) : []
    const readCount = readers.length
    const isReadByAll = isGroup ? readCount >= (roomMembers.length - 1) : (readCount > 0)

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
                                <>
                                    <img
                                        src={`${message.file_url}`}
                                        alt={message.file_name || 'Image'}
                                        className="max-w-full sm:max-w-[400px] max-h-[300px] w-auto h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain block"
                                        onError={() => setImageError(true)}
                                        onClick={() => setIsPreviewOpen(true)}
                                        loading="lazy"
                                    />
                                    {isPreviewOpen && (
                                        <div 
                                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                                            onClick={() => setIsPreviewOpen(false)}
                                        >
                                            <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center p-8">
                                                <button 
                                                    className="absolute top-4 right-4 z-[110] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all hover:scale-110"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsPreviewOpen(false);
                                                    }}
                                                >
                                                    <X className="h-6 w-6" />
                                                </button>
                                                
                                                <div 
                                                    className="relative flex items-center justify-center w-full h-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <img
                                                        src={`${message.file_url}`}
                                                        alt={message.file_name}
                                                        className="max-w-full max-h-full object-contain rounded-sm shadow-2xl select-none animate-in zoom-in-95 duration-200"
                                                    />
                                                    
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                                        <a
                                                            href={`${message.file_url}`}
                                                            download={message.file_name}
                                                            className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all text-sm font-medium backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            下载原图
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                        <span className="text-[10px] ml-1">
                            {isReadByAll ? (
                                <span className="text-primary font-medium">全部已读</span>
                            ) : readCount > 0 ? (
                                <span className="text-primary">{isGroup ? `${readCount}人已读` : '已读'}</span>
                            ) : (
                                <span className="text-muted-foreground">未读</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Message
