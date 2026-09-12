import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { useOrderFormsApi } from "../hooks/useOrderFormsApi";
import { useUpdateOrderFormStatusApi } from "../hooks/useUpdateOrderFormStatusApi";
import OrderFormListItem from "../components/OrderFormListItem";
import OrderFormDetail from "../components/OrderFormDetail";

const OrderForms = () => {
  const { data: response, isPending, isError, error, refetch } = useOrderFormsApi();
  const { mutate: updateStatus } = useUpdateOrderFormStatusApi();
  const [selectedId, setSelectedId] = useState(null);

  const orderForms = response?.data ?? [];
  const activeId = selectedId ?? orderForms[0]?.id ?? null;

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Order Forms</h1>
          <p className="text-sm text-muted-foreground">Create and manage temporary order forms before final billing.</p>
        </div>

        <Button type="button" className="h-11 bg-[#1E1B4B] shrink-0">
          <Link to="/order-forms/new" className="inline-flex items-center gap-2">
            <PlusIcon className="size-4" />
            Create Order Form
          </Link>
        </Button>
      </div>

      {isPending && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-border py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading order forms...
        </p>
      )}

      {!isPending && isError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">{error?.message ?? "Unable to load order forms."}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {!isPending && !isError && orderForms.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No order forms yet.</p>
          <Button type="button" size="sm">
            <Link to="/order-forms/new">Create your first order form</Link>
          </Button>
        </div>
      )}

      {!isPending && !isError && orderForms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Order Forms ({orderForms.length})</h2>
            <div className="flex flex-col gap-2">
              {orderForms.map((orderForm) => (
                <OrderFormListItem
                  key={orderForm.id}
                  orderForm={orderForm}
                  isSelected={orderForm.id === activeId}
                  onSelect={() => setSelectedId(orderForm.id)}
                  onChangeStatus={(status) => updateStatus({ id: orderForm.id, status })}
                />
              ))}
            </div>
          </div>

          <OrderFormDetail orderFormId={activeId} />
        </div>
      )}
    </div>
  );
};

export default OrderForms;
