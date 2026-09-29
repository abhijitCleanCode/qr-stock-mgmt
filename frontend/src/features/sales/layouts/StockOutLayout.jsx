import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/utils";

const TABS = [
    { to: "/stock-out", label: "Overview", end: true },
    { to: "/stock-out/orders", label: "Order Forms" },
    { to: "/stock-out/invoices", label: "Invoices" },
    { to: "/stock-out/parties", label: "Party Master" },
];

const StockOutLayout = () => (
    <div className="flex h-[calc(100vh-8rem)] flex-col font-sans">
        <nav className="toolbar-neu mb-5 flex w-fit shrink-0 gap-1 rounded-full p-1">
            {TABS.map((tab) => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) => cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                        isActive ? "bg-[#1E1B4B] text-white" : "text-[#1E1B4B]/70 hover:text-[#1E1B4B]",
                    )}
                >
                    {tab.label}
                </NavLink>
            ))}
        </nav>

        <div className="min-h-0 flex-1">
            <Outlet />
        </div>
    </div>
);

export default StockOutLayout;
