import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const NavigationSidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const navItems = [
        {
            icon: LayoutDashboard,
            label: '看板',
            path: '/dashboard',
            active: location.pathname === '/dashboard' || location.pathname === '/'
        },
        {
            icon: MessageSquare,
            label: '聊天',
            path: '/chat',
            active: location.pathname.startsWith('/chat')
        }
    ]

    return (
        <div className="w-full md:w-16 flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-4 bg-muted border-t md:border-t-0 md:border-r h-16 md:h-full space-x-4 md:space-x-0 md:space-y-4">
            {navItems.map((item) => (
                <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                        "p-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 md:gap-0",
                        item.active 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                >
                    <item.icon className="h-6 w-6" />
                    <span className="text-[10px] md:hidden font-medium">{item.label}</span>
                </button>
            ))}
        </div>
    )
}

export default NavigationSidebar
