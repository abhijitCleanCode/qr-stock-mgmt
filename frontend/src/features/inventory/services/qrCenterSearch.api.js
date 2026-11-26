const baseURL = import.meta.env.VITE_API_BASE_URL;

async function request(path, params) {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        search.set(key, value);
    });
    const qs = search.toString();
    const response = await fetch(`${baseURL}/qr-center${path}${qs ? `?${qs}` : ""}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message ?? data?.message ?? "QR Center request failed.");
    }
    return data;
}

export const searchQrCenterTagsApi = (params) => request("/tags", params);

// Sets (with their pieces), semi sets and loose pieces, in serial order — the reprint picker.
export const getQrCenterTreeApi = (params) => request("/tree", params);

// The challans with tags matching the search, newest first — the reprint picker's first step.
export const getQrCenterChallansApi = (params) => request("/challans", params);
