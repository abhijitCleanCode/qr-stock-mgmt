import { MoreVerticalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import OrderFormStatusBadge from "./OrderFormStatusBadge";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const OrderFormListItem = ({ orderForm, isSelected, onSelect, onChangeStatus }) => {
  const { orderFormNumber, retailerName, location, orderDate, status, itemCount } = orderForm;

  // A plain div, not a <button> — it contains the kebab menu's own real button, and a
  // <button> can never validly contain another <button>.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border p-3 text-left transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{orderFormNumber}</span>
          <span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(orderDate))}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{itemCount} Item{itemCount === 1 ? "" : "s"}</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Order form actions"
                />
              }
            >
              <MoreVerticalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onClick={() => onChangeStatus("SHARED")}>Mark as Shared</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("CONVERTED")}>Mark as Converted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeStatus("CANCELLED")} variant="destructive">Cancel Order Form</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col">
        <span className="truncate text-sm font-medium text-foreground">{retailerName}</span>
        {location && <span className="truncate text-xs text-muted-foreground">{location}</span>}
      </div>

      <div>
        <OrderFormStatusBadge status={status} />
      </div>
    </div>
  );
};

export default OrderFormListItem;
