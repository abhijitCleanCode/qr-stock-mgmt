import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { useRole } from "../context/RoleContext.jsx";

const TABS = [
    { to: "/stock-out", label: "Overview", end: true },
    { to: "/stock-out/orders", label: "Order Forms" },
    { to: "/stock-out/invoices", label: "Invoices" },
    { to: "/stock-out/parties", label: "Party Master" },
];

const StockOutLayout = () => {
    const { role, setRole } = useRole();

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col font-sans">
            <div className="mb-5 flex shrink-0 flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <nav className="toolbar-neu flex gap-1 rounded-full p-1">
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

                <label className="flex items-center gap-2 text-sm text-[#1E1B4B]/70">
                    Signed in as
                    <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-sm font-semibold text-[#1E1B4B] outline-none"
                        aria-label="Role"
                    >
                        <option value="staff">Staff</option>
                        <option value="owner">Owner</option>
                    </select>
                </label>
            </div>

            <div className="min-h-0 flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default StockOutLayout;
