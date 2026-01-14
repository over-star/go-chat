import { MessageSquare, UserMinus, FolderInput } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Card, CardContent } from './ui/card'
import { useState } from 'react'
import { cn } from '../lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog"

function FriendDetail({ friend, groups, onSendMessage, onRemoveFriend, onMoveGroup }) {
    const [showGroupSelect, setShowGroupSelect] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    if (!friend) return null

    const friendInfo = friend.friend_info
    const currentGroup = groups.find(g => g.id === friend.group_id)

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
            <Card className="w-full max-w-md border-none shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center space-y-8">
                    <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
                        <AvatarImage src={friendInfo.avatar} />
                        <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                            {friendInfo.username[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">{friendInfo.username}</h2>
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                            {currentGroup ? currentGroup.name : '未分组'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full pt-4">
                        <Button 
                            size="lg"
                            className="flex items-center gap-2"
                            onClick={() => onSendMessage(friend)}
                        >
                            <MessageSquare className="h-4 w-4" />
                            发消息
                        </Button>
                        
                        <div className="relative">
                            <Button 
                                size="lg"
                                variant="outline"
                                className="flex items-center gap-2 w-full"
                                onClick={() => setShowGroupSelect(!showGroupSelect)}
                            >
                                <FolderInput className="h-4 w-4" />
                                移动分组
                            </Button>
                            
                            {showGroupSelect && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-card border rounded-md shadow-lg p-1 animate-in fade-in zoom-in duration-75">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">选择分组</div>
                                    <div className="h-px bg-border my-1" />
                                    <button
                                        className={cn(
                                            "flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                                            !friend.group_id && "bg-accent text-primary font-medium"
                                        )}
                                        onClick={() => {
                                            onMoveGroup(friend.friend_info.id, null)
                                            setShowGroupSelect(false)
                                        }}
                                    >
                                        未分组
                                    </button>
                                    {groups.map(group => (
                                        <button
                                            key={group.id}
                                            className={cn(
                                                "flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                                                friend.group_id === group.id && "bg-accent text-primary font-medium"
                                            )}
                                            onClick={() => {
                                                onMoveGroup(friend.friend_info.id, group.id)
                                                setShowGroupSelect(false)
                                            }}
                                        >
                                            {group.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button 
                            size="lg"
                            variant="destructive"
                            className="flex items-center gap-2 col-span-2"
                            onClick={() => setConfirmDelete(true)}
                        >
                            <UserMinus className="h-4 w-4" />
                            删除好友
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>删除好友</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除好友 "{friendInfo.username}" 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                onRemoveFriend(friend.friend_info.id)
                                setConfirmDelete(false)
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            确定
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default FriendDetail
