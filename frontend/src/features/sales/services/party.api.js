import { currentRoleHeader } from "../context/RoleContext.jsx";

const baseURL = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
    const response = await fetch(`${baseURL}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...currentRoleHeader(),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        // The server's machine-readable code travels with the error so a caller can tell a
        // duplicate name (shown inline on the field) from anything else (shown as a toast).
        const error = new Error(data?.message ?? data?.error?.message ?? "Request failed.");
        error.code = data?.code ?? data?.error?.code;
        error.status = response.status;
        throw error;
    }

    return data;
}

export const getPartiesApi = ({ page = 1, limit = 50, q = "", includeInactive = false } = {}) => {
    const params = new URLSearchParams({ page, limit, includeInactive });
    if (q) params.set("q", q);

    return request(`/parties?${params.toString()}`);
};

export const getPartyApi = (id) => request(`/parties/${id}`);

export const getPartySummaryApi = () => request("/parties/summary");

export const createPartyApi = (payload) => request("/parties", { method: "POST", body: JSON.stringify(payload) });

export const updatePartyApi = (id, payload) => request(`/parties/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const updatePartyStatusApi = (id, isActive) =>
    request(`/parties/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
