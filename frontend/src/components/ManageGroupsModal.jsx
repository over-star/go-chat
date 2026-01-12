import React, { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'

export default function ManageGroupsModal({ groups, onGroupsChange, onClose }) {
    const [newGroupName, setNewGroupName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return
        try {
            setLoading(true)
            await friendGroupService.createGroup(newGroupName.trim())
            setNewGroupName('')
            onGroupsChange()
            errorHandler.success('Group created')
        } catch (error) {
            // Handled by interceptor
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteGroup = async (id) => {
        if (!confirm('Are you sure you want to delete this group? Friends in this group will be moved to Ungrouped.')) return
        try {
            setLoading(true)
            await friendGroupService.deleteGroup(id)
            onGroupsChange()
            errorHandler.success('Group deleted')
        } catch (error) {
            // Handled by interceptor
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md border shadow-lg rounded-xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Manage Friend Groups</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b">
                    <div className="flex gap-2">
                        <Input
                            placeholder="New group name..."
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                        />
                        <Button onClick={handleCreateGroup} disabled={loading || !newGroupName.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {groups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No custom groups created yet.
                            </div>
                        ) : (
                            groups.map(group => (
                                <div key={group.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                    <span className="font-medium">{group.name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                        onClick={() => handleDeleteGroup(group.id)}
                                        disabled={loading}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
