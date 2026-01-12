import { File, Image as ImageIcon, Check, CheckCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '../lib/utils'

function Message({ message, isOwn, roomMembers }) {
    const formatTime = (timestamp) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    const hasBeenRead = message.read_by && message.read_by.length > 0

    return (
        <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
            {!isOwn && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.avatar} />
                    <AvatarFallback>{message.sender?.username?.[0]}</AvatarFallback>
                </Avatar>
            )}

            <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                {!isOwn && (
                    <span className="text-xs font-medium text-muted-foreground mb-1 px-1">
                        {message.sender?.username}
                    </span>
                )}

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
                        <div>
                            <img
                                src={`http://localhost:8080${message.file_url}`}
                                alt={message.file_name}
                                className="max-w-sm rounded-lg mb-2"
                            />
                            {message.content && (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                        </div>
                    )}

                    {message.type === 'file' && (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-background/20 flex items-center justify-center">
                                <File className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.file_name}</p>
                                <p className="text-xs opacity-70">
                                    {(message.file_size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <a
                                href={`http://localhost:8080${message.file_url}`}
                                download={message.file_name}
                                className="text-xs underline"
                            >
                                Download
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
