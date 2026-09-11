const baseURL = import.meta.env.VITE_API_BASE_URL;

export const getOrderFormsApi = async ({ page = 1, limit = 50 } = {}) => {
    const params = new URLSearchParams({ page, limit });

    const response = await fetch(`${baseURL}/order-forms?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch order forms.");
    }

    return data;
};

export const getOrderFormDetailApi = async (id) => {
    const response = await fetch(`${baseURL}/order-forms/${id}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch order form.");
    }

    return data;
};

export const createOrderFormApi = async (payload) => {
    const response = await fetch(`${baseURL}/order-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to create order form.");
    }

    return data;
};

export const updateOrderFormApi = async (id, payload) => {
    const response = await fetch(`${baseURL}/order-forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to update order form.");
    }

    return data;
};

export const updateOrderFormStatusApi = async (id, status) => {
    const response = await fetch(`${baseURL}/order-forms/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to update order form status.");
    }

    return data;
};
