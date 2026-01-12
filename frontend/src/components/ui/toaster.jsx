import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
    return (
        <Sonner
            theme="light"
            className="toaster group"
            position="bottom-right"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    error: "group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground group-[.toast]:border-destructive",
                    success: "group-[.toast]:bg-green-500 group-[.toast]:text-white",
                    warning: "group-[.toast]:bg-yellow-500 group-[.toast]:text-white",
                    info: "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
