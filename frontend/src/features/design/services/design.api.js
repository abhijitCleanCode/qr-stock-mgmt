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
