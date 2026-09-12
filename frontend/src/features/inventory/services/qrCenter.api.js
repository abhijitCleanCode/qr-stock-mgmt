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

// One registration detail endpoint per registration type — a Stock In transaction and a
// transformation event use different route shapes on the backend (see qrCenter.route.js),
// but both return the same { registration, qrs } shape (see qrCenter.service.js).
export const getQrCenterRegistrationDetailApi = async ({ registrationType, registrationId }) => {
    const path = registrationType === "TRANSFORMATION"
        ? `/qr-center/transformation/${registrationId}`
        : `/qr-center/${registrationId}`;

    const response = await fetch(`${baseURL}${path}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch stock registration QRs.");
    }

    return data;
};
