const baseURL = import.meta.env.VITE_API_BASE_URL;

export const registerStockOutApi = async (payload) => {
    const response = await fetch(`${baseURL}/stock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to register stock out.");
    }

    return data;
};
