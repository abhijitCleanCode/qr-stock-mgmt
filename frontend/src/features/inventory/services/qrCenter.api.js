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

/* ------------------------------------------------------------------------
 * QR Center — resolver, health, queues, bulk generators, library
 * ---------------------------------------------------------------------- */

export const resolveQrCenterCodeApi = (code) =>
    qrCenterRequest("/resolve", { params: { code } });

export const getQrCenterHealthApi = () => qrCenterRequest("/health");

export const getQrCenterToTagApi = ({ page = 1, limit = 20 } = {}) =>
    qrCenterRequest("/to-tag", { params: { page, limit } });

export const getQrCenterReprintsApi = ({ status = "PENDING", page = 1, limit = 50 } = {}) =>
    qrCenterRequest("/reprints", { params: { status, page, limit } });

export const createQrCenterReprintApi = ({ stockItemId, reasonCode, raisedBy, rackId }) =>
    qrCenterRequest("/reprints", { method: "POST", body: { stockItemId, reasonCode, raisedBy, rackId } });

export const bulkPrintReprintsApi = ({ reprintRequestIds, printerId }) =>
    qrCenterRequest("/reprints/bulk-print", { method: "POST", body: { reprintRequestIds, printerId } });

export const getQrCenterStaleApi = () => qrCenterRequest("/stale");

export const reprintStaleApi = ({ designId, scope }) =>
    qrCenterRequest("/stale/reprint", { method: "POST", body: { designId, scope } });

export const acceptStaleApi = ({ designId }) =>
    qrCenterRequest("/stale/accept", { method: "POST", body: { designId } });

export const getQrCenterRecoveryApi = ({ status = "PENDING" } = {}) =>
    qrCenterRequest("/recovery", { params: { status } });

export const createRecoveryEntryApi = ({ foundLocation, notes }) =>
    qrCenterRequest("/recovery", { method: "POST", body: { foundLocation, notes } });

export const assignRecoveryIdentityApi = ({ id, designId, colorVariantId, rackId, supervisorName, acknowledged, claimShortCode }) =>
    qrCenterRequest(`/recovery/${id}/assign-identity`, {
        method: "POST",
        body: { designId, colorVariantId, rackId, supervisorName, acknowledged, claimShortCode },
    });

export const getQrCenterJobsApi = ({ status, page = 1, limit = 20 } = {}) =>
    qrCenterRequest("/jobs", { params: { status, page, limit } });

export const reprintJobRangeApi = ({ id, fromSeq, toSeq }) =>
    qrCenterRequest(`/jobs/${id}/reprint-range`, { method: "POST", body: { fromSeq, toSeq } });

export const verifyJobSampleApi = ({ id }) =>
    qrCenterRequest(`/jobs/${id}/verify-sample`, { method: "POST" });

export const breakSetApi = ({ stockItemId, reasonCode, note }) =>
    qrCenterRequest("/break-set", { method: "POST", body: { stockItemId, reasonCode, note } });

export const bulkGenerateApi = ({ kind, ...body }) =>
    qrCenterRequest(`/bulk/${kind}`, { method: "POST", body });

export const printCheckApi = ({ stockItemQrIds }) =>
    qrCenterRequest("/print-check", { method: "POST", body: { stockItemQrIds } });

export const getQrCenterReferenceApi = () => qrCenterRequest("/reference");
