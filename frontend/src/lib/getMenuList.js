import { PenTool } from "lucide-react";

export const getMenuList = ({ pathname }) => {
    return [
        {
            groupLabel: "Design",
            menus: [
                {
                    href: "/design/register",
                    label: "Register Design",
                    icon: PenTool,
                    active: pathname.startsWith("/design"),
                    submenus: [],
                },
            ],
        },
    ];
};
