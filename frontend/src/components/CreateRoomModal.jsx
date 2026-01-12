import { useState } from 'react'
import { roomService } from '../services/roomService'
import errorHandler from '../utils/errorHandler'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Loader2, X, ChevronDown, ChevronRight, Users } from 'lucide-react'

function CreateRoomModal({ friends, groups, onRoomCreated, onClose }) {
    const [roomName, setRoomName] = useState('')
    const [selectedFriends, setSelectedFriends] = useState([])
    const [loading, setLoading] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState(new Set(['Ungrouped']))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!roomName.trim() || selectedFriends.length === 0) return

        try {
            setLoading(true)
            const response = await roomService.createRoom(roomName, 'group', selectedFriends)
            if (response.data) {
                onRoomCreated(response.data)
                errorHandler.success('Group chat created')
                onClose()
            }
        } catch (error) {
            // Global handler handled by roomService/api
        } finally {
            setLoading(false)
        }
    }

    const toggleGroup = (groupName) => {
        const newExpanded = new Set(expandedGroups)
        if (newExpanded.has(groupName)) {
            newExpanded.delete(groupName)
        } else {
            newExpanded.add(groupName)
        }
        setExpandedGroups(newExpanded)
    }

    const toggleFriend = (friendId) => {
        if (selectedFriends.includes(friendId)) {
            setSelectedFriends(selectedFriends.filter(id => id !== friendId))
        } else {
            setSelectedFriends([...selectedFriends, friendId])
        }
    }

    const groupedFriends = groups.map(g => ({
        ...g,
        friends: friends.filter(f => f.group_id === g.id)
    })).filter(g => g.friends.length > 0)

    const ungroupedFriends = friends.filter(f => !f.group_id)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md border shadow-lg rounded-xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Create Group Chat</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col flex-1 overflow-hidden">
                    <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Group Name</label>
                            <Input
                                placeholder="Enter group name..."
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Select Members</label>
                                <span className="text-xs text-muted-foreground">{selectedFriends.length} selected</span>
                            </div>

                            <ScrollArea className="flex-1 border rounded-md p-2">
                                <div className="space-y-4">
                                    {/* Grouped Friends */}
                                    {groupedFriends.map(group => (
                                        <div key={group.id} className="space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(group.name)}
                                                className="flex items-center gap-1 w-full text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
                                            >
                                                {expandedGroups.has(group.name) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                {group.name.toUpperCase()} ({group.friends.length})
                                            </button>

                                            {expandedGroups.has(group.name) && group.friends.map(friend => (
                                                <FriendCheckbox
                                                    key={friend.id}
                                                    friend={friend}
                                                    isSelected={selectedFriends.includes(friend.friend.id)}
                                                    onToggle={() => toggleFriend(friend.friend.id)}
                                                />
                                            ))}
                                        </div>
                                    ))}

                                    {/* Ungrouped Friends */}
                                    {ungroupedFriends.length > 0 && (
                                        <div className="space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup('Ungrouped')}
                                                className="flex items-center gap-1 w-full text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
                                            >
                                                {expandedGroups.has('Ungrouped') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                UNGROUPED ({ungroupedFriends.length})
                                            </button>

                                            {expandedGroups.has('Ungrouped') && ungroupedFriends.map(friend => (
                                                <FriendCheckbox
                                                    key={friend.id}
                                                    friend={friend}
                                                    isSelected={selectedFriends.includes(friend.friend.id)}
                                                    onToggle={() => toggleFriend(friend.friend.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !roomName.trim() || selectedFriends.length === 0} className="flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                            Create Group
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function FriendCheckbox({ friend, isSelected, onToggle }) {
    return (
        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary"
                checked={isSelected}
                onChange={onToggle}
            />
            <Avatar className="h-8 w-8">
                <AvatarImage src={friend.friend.avatar} />
                <AvatarFallback>{friend.friend.username[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{friend.friend.username}</span>
        </label>
    )
}

export default CreateRoomModal
