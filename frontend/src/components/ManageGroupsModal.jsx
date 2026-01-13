import React, { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { friendGroupService } from '../services/friendGroupService'
import errorHandler from '../utils/errorHandler'
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

export default function ManageGroupsModal({ groups, onGroupsChange, onClose }) {
    const [newGroupName, setNewGroupName] = useState('')
    const [loading, setLoading] = useState(false)
    const [confirmConfig, setConfirmConfig] = useState(null)

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return
        try {
            setLoading(true)
            await friendGroupService.createGroup(newGroupName.trim())
            setNewGroupName('')
            onGroupsChange()
            errorHandler.success('分组已创建')
        } catch (error) {
            // Handled by interceptor
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteGroup = async (id) => {
        setConfirmConfig({
            title: '删除分组',
            description: '确定要删除该分组吗？该分组下的好友将被移动到“未分组”。',
            onConfirm: async () => {
                try {
                    setLoading(true)
                    await friendGroupService.deleteGroup(id)
                    onGroupsChange()
                    errorHandler.success('分组已删除')
                } catch (error) {
                    // Handled by interceptor
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <AlertDialog open={!!confirmConfig} onOpenChange={() => setConfirmConfig(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmConfig?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmConfig?.onConfirm}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="bg-card w-full max-w-md border shadow-lg rounded-xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">管理好友分组</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b">
                    <div className="flex gap-2">
                        <Input
                            placeholder="新分组名称..."
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                        />
                        <Button onClick={handleCreateGroup} disabled={loading || !newGroupName.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            创建
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {groups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                暂无自定义分组。
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
