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
            ],
        },
    ];
};
