const baseURL = import.meta.env.VITE_API_BASE_URL;

export const getQrCenterListApi = async ({ page = 1, limit = 20, keyword } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (keyword) params.set("keyword", keyword);

    const response = await fetch(`${baseURL}/qr-center?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch QR center stock.");
    }

    return data;
};

export const generateQrCodesApi = async (stockItemIds) => {
    const response = await fetch(`${baseURL}/qr-center/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockItemIds }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to generate QR codes.");
    }

    return data;
};
