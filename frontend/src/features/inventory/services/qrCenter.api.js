const baseURL = import.meta.env.VITE_API_BASE_URL;

// Shared thin fetch helper for the QR Center additions below — same contract as the
// hand-written functions above (JSON body, throw on non-ok using ApiResponse's error shape).
async function qrCenterRequest(path, { method = "GET", body, params } = {}) {
    let url = `${baseURL}/qr-center${path}`;
    if (params) {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return;
            search.set(key, value);
        });
        const qs = search.toString();
        if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? data?.message ?? "QR Center request failed.");
    }

    return data;
}

export const getQrCenterListApi = async ({ page = 1, limit = 20, keyword, designId, colorVariantId, dateFrom, dateTo, sort } = {}) =>
    qrCenterRequest("", { params: { page, limit, keyword, designId, colorVariantId, dateFrom, dateTo, sort } });

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

/* ------------------------------------------------------------------------
 * QR Center — resolve, reprint, reference
 * ---------------------------------------------------------------------- */

export const resolveQrCenterCodeApi = (code) =>
    qrCenterRequest("/resolve", { params: { code } });

export const createQrCenterReprintApi = ({ stockItemId, reasonCode, raisedBy, rackId }) =>
    qrCenterRequest("/reprints", { method: "POST", body: { stockItemId, reasonCode, raisedBy, rackId } });

export const bulkPrintReprintsApi = ({ reprintRequestIds, printerId }) =>
    qrCenterRequest("/reprints/bulk-print", { method: "POST", body: { reprintRequestIds, printerId } });

export const printCheckApi = ({ stockItemQrIds }) =>
    qrCenterRequest("/print-check", { method: "POST", body: { stockItemQrIds } });

export const getQrCenterReferenceApi = () => qrCenterRequest("/reference");

export const generateQrApi = (stockItemIds) =>
    qrCenterRequest("/generate", { method: "POST", body: { stockItemIds } });
