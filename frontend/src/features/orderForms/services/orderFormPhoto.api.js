const baseURL = import.meta.env.VITE_API_BASE_URL;

export const getOrderFormPhotosApi = async (orderFormId) => {
    const response = await fetch(`${baseURL}/order-forms/${orderFormId}/photos`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch photos.");
    }

    return data;
};

export const uploadOrderFormPhotosApi = async (orderFormId, files) => {
    const formData = new FormData();
    for (const file of files) formData.append("photos", file);

    const response = await fetch(`${baseURL}/order-forms/${orderFormId}/photos`, {
        method: "POST",
        body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to upload photos.");
    }

    return data;
};

export const deleteOrderFormPhotoApi = async (orderFormId, photoId) => {
    const response = await fetch(`${baseURL}/order-forms/${orderFormId}/photos/${photoId}`, {
        method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to delete photo.");
    }

    return data;
};

export const getOrderFormPhotosDownloadAllApi = async (orderFormId) => {
    const response = await fetch(`${baseURL}/order-forms/${orderFormId}/photos/download-all`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to build the download.");
    }

    return data;
};

export const getSharedOrderFormApi = async (orderFormNumber) => {
    const response = await fetch(`${baseURL}/order-forms/share/${orderFormNumber}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to fetch order form.");
    }

    return data;
};
