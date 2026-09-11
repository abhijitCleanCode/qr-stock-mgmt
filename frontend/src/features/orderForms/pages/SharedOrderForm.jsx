import { useState } from "react";
import { useParams } from "react-router";
import { Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/shared/table/DataTable";
import { useSharedOrderFormApi } from "../hooks/useSharedOrderFormApi";
import { columns } from "../table/OrderFormItemColumns";
import OrderFormStatusBadge from "../components/OrderFormStatusBadge";
import PhotoLightbox from "../components/PhotoLightbox";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatInr = (amount) => `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

// Public, read-only view behind the "Share on WhatsApp" link — reachable without going
// through the sidebar/nav app shell, and keyed by the human-readable order form number rather
// than the internal id (see orderFormPhoto.service.getSharedOrderForm).
const SharedOrderForm = () => {
  const { orderFormNumber } = useParams();
  const { data: response, isPending, isError, error } = useSharedOrderFormApi(orderFormNumber);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const detail = response?.data;
  const photos = detail?.photos ?? [];

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-lg font-bold text-[#1E1B4B]">Order Form</h1>

        {isPending && (
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading order form...
          </p>
        )}

        {!isPending && isError && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white py-16 text-center">
            <p className="text-sm text-muted-foreground">{error?.message ?? "This order form link is invalid or no longer available."}</p>
          </div>
        )}

        {!isPending && !isError && detail && (
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Item Photos Gallery</h3>
                <Badge variant="secondary">{detail.photoCount}</Badge>
              </div>

              {photos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/20 py-6 text-center text-sm text-muted-foreground">
                  No photos added yet
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="size-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-muted sm:size-28"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <img src={photo.imageUrl} alt="Order form item" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {lightboxIndex !== null && (
          <PhotoLightbox
            photos={photos}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SharedOrderForm;
