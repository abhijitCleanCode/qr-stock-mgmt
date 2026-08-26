import { PenTool } from "lucide-react";

export const getMenuList = ({ pathname }) => {
    return [
        {
            groupLabel: "Master Data",
            menus: [
                {
                    href: "/design",
                    label: "Design Master",
                    icon: PenTool,
                    active: pathname.startsWith("/design"),
                    submenus: [],
                },
            ],
        },
    ];
};
