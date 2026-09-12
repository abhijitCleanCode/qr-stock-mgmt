import { Loader2Icon, MoreVerticalIcon, PencilIcon, Share2Icon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from "@/components/shared/table/DataTable";
import { useOrderFormDetailApi } from "../hooks/useOrderFormDetailApi";
import { useUpdateOrderFormStatusApi } from "../hooks/useUpdateOrderFormStatusApi";
import { columns } from "../table/OrderFormItemColumns";
import OrderFormStatusBadge from "./OrderFormStatusBadge";
import ItemPhotosGallery from "./ItemPhotosGallery";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatInr = (amount) => `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const OrderFormDetail = ({ orderFormId }) => {
  const { data: response, isPending, isError, error, refetch } = useOrderFormDetailApi(orderFormId);
  const { mutate: updateStatus } = useUpdateOrderFormStatusApi();
  const detail = response?.data;

  if (!orderFormId) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-16 text-center">
        <p className="text-sm text-muted-foreground">Select an order form from the list to see its details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border p-4 sm:p-6">
      {isPending && (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading order form...
        </p>
      )}

      {!isPending && isError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{error?.message ?? "Unable to load this order form."}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {!isPending && !isError && detail && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Order Form Details</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#1E1B4B]">{detail.orderFormNumber}</span>
                <OrderFormStatusBadge status={detail.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {detail.retailerName}
                {detail.contactPerson && <> · {detail.contactPerson}</>}
                {detail.location && <> · {detail.location}</>}
                {" · "}
                {dateFormatter.format(new Date(detail.orderDate))}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" size="sm">
                <Link to={`/order-forms/${detail.id}/edit`} className="inline-flex items-center gap-2">
                  <PencilIcon className="size-4" />
                  Edit
                </Link>
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                <Share2Icon className="size-4" />
                Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon-sm" aria-label="More actions" />}>
                  <MoreVerticalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => updateStatus({ id: detail.id, status: "SHARED" })}>Mark as Shared</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus({ id: detail.id, status: "CONVERTED" })}>Mark as Converted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus({ id: detail.id, status: "CANCELLED" })} variant="destructive">Cancel Order Form</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Order Items</h3>
            <DataTable
              columns={columns}
              data={detail.items}
              emptyState={{ title: "No items yet", description: "This order form has no items." }}
            />

            {detail.items.length > 0 && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-2.5 sm:px-6">
                <span className="text-sm font-semibold text-foreground">Total Estimated Value</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatInr(detail.summary.estimatedValue)}
                </span>
              </div>
            )}
          </div>

          <ItemPhotosGallery orderFormId={detail.id} orderFormNumber={detail.orderFormNumber} />
        </>
      )}
    </div>
  );
};

export default OrderFormDetail;
