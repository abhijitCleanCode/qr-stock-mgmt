import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { cn } from "@/lib/utils"
import SidebarToggle from "./SidebarToggle";
import { toggleSidebar } from "@/app/slice/sidebarSlice";
import Menu from "./Menu";

const Sidebar = () => {
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.sidebar.isOpen)

    return (
        <aside className={cn("fixed top-0 left-0 z-40 h-screen -translate-x-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border lg:translate-x-0 transition-[width] ease-in-out duration-300", isOpen ? "w-[90px]" : "w-72")} aria-label="sidebar">
            <SidebarToggle
                isOpen={isOpen}
                setIsOpen={() => { dispatch(toggleSidebar()) }}
            />
            <div className="relative h-full flex flex-col px-3 py-4 shadow-md">
                <Menu isOpen={!isOpen} />
            </div>
        </aside>
    )
}

export default Sidebar
