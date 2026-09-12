import { RefreshCw } from "lucide-react";
import { Palette, ArrowDownLeft, RotateCcwClock, QrCode, Box } from "lucide-react";

export const getMenuList = ({ pathname }) => {
    return [
        {
            groupLabel: "Master Data",
            menus: [
                {
                    href: "/designs",
                    label: "Design Master",
                    icon: Palette,
                    active: pathname.startsWith("/designs"),
                    submenus: [],
                },
            ],
        },
        {
            groupLabel: "Inventory",
            menus: [
                {
                    href: "/stock-in",
                    label: "Stock In",
                    icon: ArrowDownLeft,
                    active: pathname.startsWith("/stock-in"),
                    submenus: [],
                },
                {
                    href: "/current-stock",
                    label: "Current Stock",
                    icon: Box,
                    active: pathname.startsWith("/current-stock"),
                    submenus: [],
                },
                {
                    href: "/qr-center",
                    label: "QR Center",
                    icon: QrCode,
                    active: pathname.startsWith("/qr-center"),
                    submenus: [],
                },
                {
                    href: "/stock-history",
                    label: "Stock History",
                    icon: RotateCcwClock,
                    active: pathname.startsWith("/stock-history"),
                    submenus: [],
                },
                {
                    href: "/stock-out",
                    label: "Stock Out",
                    icon: ArrowDownLeft,
                    active: pathname.startsWith("/stock-out"),
                    submenus: [],
                },
                {
                    href: "/stock-transformation",
                    label: "Stock Transformation",
                    icon: RefreshCw,
                    active: pathname.startsWith("/stock-transformation"),
                    submenus: [],
                }
            ],
        },
    ];
};
