import { Box } from "lucide-react";
import { QrCode } from "lucide-react";
import { Palette, ArrowDownLeft } from "lucide-react";

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
            ],
        },
    ];
};
