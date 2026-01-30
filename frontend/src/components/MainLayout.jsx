import NavigationSidebar from './NavigationSidebar'

const MainLayout = ({ children }) => {
    return (
        <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
            <main className="flex-1 h-full relative overflow-hidden order-1 md:order-2">
                {children}
            </main>
            <div className="order-2 md:order-1">
                <NavigationSidebar />
            </div>
        </div>
    )
}

export default MainLayout
