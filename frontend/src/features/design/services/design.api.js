const baseURL = import.meta.env.VITE_API_BASE_URL;

export const registerDesignApi = async ({ colorVariants, designSizes, images, ...designData }) => {
    const formData = new FormData();

    Object.entries(designData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value);
        }
    });

    formData.append("colorVariants", JSON.stringify(colorVariants));
    formData.append("designSizes", JSON.stringify(designSizes));

    images.forEach((image) => formData.append("images", image));

    const response = await fetch(`${baseURL}/designs`, {
        method: "POST",
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to register design.");
    }

    return data;
};

export const getAllDesignsApi = async ({ page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams({ page, limit });

    const response = await fetch(`${baseURL}/designs?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch designs.");
    }

    return data;
};

export const searchDesignsApi = async (keyword) => {
    const params = new URLSearchParams({ keyword });

    const response = await fetch(`${baseURL}/designs/search?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to search designs.");
    }

    return data;
};

export const searchJobbersApi = async (keyword) => {
    const params = new URLSearchParams({ keyword });

    const response = await fetch(`${baseURL}/designs/jobbers?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to search jobbers.");
    }

    return data;
};

export const searchQualitiesApi = async (keyword) => {
    const params = new URLSearchParams({ keyword });

    const response = await fetch(`${baseURL}/designs/qualities?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to search qualities.");
    }

    return data;
};

export const searchPatternsApi = async (keyword) => {
    const params = new URLSearchParams({ keyword });

    const response = await fetch(`${baseURL}/designs/patterns?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to search patterns.");
    }

    return data;
};

export const getActiveColorVariantSizesApi = async (colorVariantId) => {
    const response = await fetch(`${baseURL}/designs/color-variants/${colorVariantId}/sizes`);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch active sizes.");
    }

    return data;
};
