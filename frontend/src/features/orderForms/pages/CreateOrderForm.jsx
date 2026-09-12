import { useState } from "react";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DesignSearchInput from "@/features/inventory/components/DesignSearchInput";
import { getVariantKey } from "@/features/inventory/utils/variantKey";
import { useOrderFormVariantConfigs } from "../hooks/useOrderFormVariantConfigs";
import { useCreateOrderFormApi } from "../hooks/useCreateOrderFormApi";
import { useUpdateOrderFormApi } from "../hooks/useUpdateOrderFormApi";
import { useOrderFormDetailApi } from "../hooks/useOrderFormDetailApi";
import { buildOrderFormPayload } from "../utils/buildOrderFormPayload";
import OrderFormVariantCard from "../components/OrderFormVariantCard";

const todayAsIsoDate = () => new Date().toISOString().slice(0, 10);

const EMPTY_INITIAL_VALUES = {
  retailerName: "",
  contactPerson: "",
  location: "",
  orderDate: todayAsIsoDate(),
  variants: [],
  configsByKey: {},
};

// Rebuilds the { variant, config } shape the form edits from an existing order form's flat
// items list. Quantity is always edited manually per size, in pieces — so every item, whether
// it was originally saved as SET or LOOSE_PIECE, is flattened into a single per-size piece
// breakdown here using its sizeBreakdown (which the API already expands per size for both
// types). A variant that contributed two rows (e.g. an old SET row plus a LOOSE_PIECE row)
// merges into one: per-size quantities add up, and the unit price becomes the blended
// per-piece price (total value / total pieces) so the total estimated value is preserved.
function flattenItemToPieces(item) {
  const breakdown = {};
  for (const size of item.sizeBreakdown ?? []) {
    if (size.quantity > 0) breakdown[size.designSizeId] = size.quantity;
  }
  return { breakdown, quantity: item.quantity, value: item.estimatedValue };
}

function buildInitialValuesFromDetail(detail) {
  const variants = [];
  const configsByKey = {};
  const totalsByKey = {};

  for (const item of detail.items) {
    const variant = {
      designId: item.designId,
      colorVariantId: item.colorVariantId,
      designCode: item.designCode,
      designName: item.designName,
      colorName: item.colorName,
      colorHex: item.colorHex,
      imageUrl: item.imageUrl,
    };
    const key = getVariantKey(variant);

    if (!configsByKey[key]) {
      variants.push(variant);
      configsByKey[key] = { designId: variant.designId, colorVariantId: variant.colorVariantId, loosePieces: {}, looseUnitPrice: 0 };
      totalsByKey[key] = { quantity: 0, value: 0 };
    }

    const { breakdown, quantity, value } = flattenItemToPieces(item);
    const config = configsByKey[key];
    for (const [sizeId, sizeQuantity] of Object.entries(breakdown)) {
      config.loosePieces[sizeId] = (config.loosePieces[sizeId] ?? 0) + sizeQuantity;
    }
    totalsByKey[key].quantity += quantity;
    totalsByKey[key].value += value;
  }

  for (const key of Object.keys(configsByKey)) {
    const { quantity, value } = totalsByKey[key];
    configsByKey[key].looseUnitPrice = quantity > 0 ? Number((value / quantity).toFixed(2)) : 0;
  }

  return {
    retailerName: detail.retailerName,
    contactPerson: detail.contactPerson ?? "",
    location: detail.location ?? "",
    orderDate: detail.orderDate,
    variants,
    configsByKey,
  };
}

// Thin wrapper: resolves what "initial values" the builder below should mount with (fetching
// the existing order form first in edit mode), so the builder itself never has to react to
// data arriving after mount — it only ever initializes state once, from props.
const CreateOrderForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { data: detailResponse, isPending: isDetailPending, isError, error } = useOrderFormDetailApi(isEditMode ? id : null);

  if (isEditMode && isDetailPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading order form...
      </p>
    );
  }

  if (isEditMode && isError) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {error?.message ?? "Unable to load this order form."}
      </p>
    );
  }

  const initialValues = isEditMode ? buildInitialValuesFromDetail(detailResponse.data) : EMPTY_INITIAL_VALUES;

  return <OrderFormBuilder key={id ?? "new"} isEditMode={isEditMode} orderFormId={id} initialValues={initialValues} />;
};

const OrderFormBuilder = ({ isEditMode, orderFormId, initialValues }) => {
  const navigate = useNavigate();

  const [retailerName, setRetailerName] = useState(initialValues.retailerName);
  const [contactPerson, setContactPerson] = useState(initialValues.contactPerson);
  const [location, setLocation] = useState(initialValues.location);
  const [orderDate, setOrderDate] = useState(initialValues.orderDate);

  const [selectedVariants, setSelectedVariants] = useState(initialValues.variants);
  const [expandedVariantKey, setExpandedVariantKey] = useState(null);

  const {
    configs,
    ensureConfig,
    removeConfig,
    setLoosePieces,
    setLooseUnitPrice,
    reset: resetConfigs,
  } = useOrderFormVariantConfigs(initialValues.configsByKey);

  const { mutateAsync: createOrderForm, isPending: isCreating } = useCreateOrderFormApi();
  const { mutateAsync: updateOrderForm, isPending: isUpdating } = useUpdateOrderFormApi();
  const isPending = isCreating || isUpdating;

  const handleSelect = (variant) => {
    const key = getVariantKey(variant);

    setSelectedVariants((prev) =>
      prev.some((item) => getVariantKey(item) === key) ? prev : [...prev, variant]
    );
    ensureConfig(variant);
    setExpandedVariantKey(key);
  };

  const handleRemove = (key) => {
    setSelectedVariants((prev) => prev.filter((item) => getVariantKey(item) !== key));
    removeConfig(key);
  };

  const handleSubmit = async () => {
    if (!retailerName.trim()) {
      toast.error("Enter the retailer name before saving.");
      return;
    }

    const payload = buildOrderFormPayload(
      { retailerName: retailerName.trim(), contactPerson: contactPerson.trim(), location: location.trim(), orderDate },
      selectedVariants,
      configs
    );

    if (payload.items.length === 0) {
      toast.error("Add at least one item before saving the order form.");
      return;
    }

    try {
      if (isEditMode) {
        const response = await updateOrderForm({ id: orderFormId, payload });
        toast.success(`Order form ${response.data.orderFormNumber} updated successfully.`);
      } else {
        const response = await createOrderForm(payload);
        toast.success(`Order form ${response.data.orderFormNumber} created successfully.`);
        resetConfigs();
      }
      navigate("/order-forms");
    } catch (error) {
      toast.error(error?.message ?? "Couldn't save the order form. Please try again.");
    }
  };

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link to="/order-forms" className="inline-flex items-center gap-1.5">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">
          {isEditMode ? "Edit Order Form" : "Create Order Form"}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="retailer-name">Retailer Name</label>
          <Input id="retailer-name" value={retailerName} onChange={(event) => setRetailerName(event.target.value)} placeholder="e.g. Sharma Textiles" className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="contact-person">Contact Person</label>
          <Input id="contact-person" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} placeholder="e.g. Amit Sharma" className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="location">Location</label>
          <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Jaipur" className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="order-date">Order Date</label>
          <Input id="order-date" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} className="h-11" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium" htmlFor="design-search">Design</label>
        <DesignSearchInput id="design-search" onSelect={handleSelect} />
      </div>

      {selectedVariants.length > 0 && (
        <div className="flex flex-col gap-3">
          {selectedVariants.map((variant) => {
            const key = getVariantKey(variant);
            const config = configs[key];
            if (!config) return null;

            return (
              <OrderFormVariantCard
                key={key}
                variant={variant}
                config={config}
                isExpanded={key === expandedVariantKey}
                onToggle={(open) => setExpandedVariantKey(open ? key : null)}
                onRemove={() => handleRemove(key)}
                onSetLoosePieces={(loosePieces) => setLoosePieces(key, loosePieces)}
                onSetLooseUnitPrice={(value) => setLooseUnitPrice(key, value)}
              />
            );
          })}
        </div>
      )}

      {selectedVariants.length > 0 && (
        <Button
          type="button"
          className="h-11 w-full bg-[#1E1B4B] sm:w-auto sm:self-end"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Saving..." : isEditMode ? "Save Changes" : "Create Order Form"}
        </Button>
      )}
    </div>
  );
};

export default CreateOrderForm;
