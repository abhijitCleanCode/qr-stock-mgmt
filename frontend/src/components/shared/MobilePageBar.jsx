import { useLocation } from "react-router";

import { getMenuList } from "@/lib/getMenuList";

// Phone-only bar that names the page you are on ("Inventory › Stock In"). It sits at the top of the
// scrolling content, so it stays in view while the page scrolls and the user always knows where they are.
const MobilePageBar = () => {
  const { pathname } = useLocation();

  const current = getMenuList({ pathname })
    .flatMap((group) => group.menus.map((item) => ({ ...item, groupLabel: group.groupLabel })))
    .filter((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!current) return null;
  const Icon = current.icon;

  return (
    <div className="sticky top-0 z-10 -mx-2 mb-4 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2.5 text-sm backdrop-blur md:hidden">
      {Icon && <Icon className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />}
      {current.groupLabel && <span className="shrink-0 text-muted-foreground">{current.groupLabel} ›</span>}
      <span className="min-w-0 truncate font-bold text-foreground">{current.label}</span>
    </div>
  );
};

export default MobilePageBar;
