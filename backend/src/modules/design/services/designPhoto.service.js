import ApiError from "../../../core/apiError.js";
import { db } from "../../../database/index.js";
import mediaUploadService from "../../../core/media/mediaUploadService.js";

import designMasterRepository from "../repositories/designMaster.repository.js";

// Largest number of photos one request may carry. The client sends bigger sets in several requests.
export const MAX_PHOTOS_PER_REQUEST = 20;

class DesignPhotoService {
    _repository = designMasterRepository;
    _mediaUploadService = mediaUploadService;

    // Gives each colour variant a new photo: files[i] becomes the photo of colorVariantIds[i].
    // Everything is checked before anything is uploaded. Photos are uploaded first; the variant rows
    // are then changed in one transaction. If that fails, the new uploads are removed again.
    // Replaced photos are deliberately left in storage: an order form may still show one of them.
    async replaceVariantPhotos(files, colorVariantIds) {
        if (files.length === 0) throw new ApiError("Choose at least one photo.", 400, "NO_PHOTOS");
        if (files.length > MAX_PHOTOS_PER_REQUEST) {
            throw new ApiError(`Upload at most ${MAX_PHOTOS_PER_REQUEST} photos at a time.`, 400, "TOO_MANY_PHOTOS");
        }
        if (files.length !== colorVariantIds.length) {
            throw new ApiError(`Got ${files.length} photo(s) for ${colorVariantIds.length} colour(s).`, 400, "PHOTO_COUNT_MISMATCH");
        }
        if (new Set(colorVariantIds).size !== colorVariantIds.length) {
            throw new ApiError("A colour can take only one photo per upload.", 400, "DUPLICATE_VARIANT_PHOTO");
        }

        const found = await this._repository.findVariantsForPhotos(db, colorVariantIds);
        const activeIds = new Set(found.filter((variant) => variant.isActive).map((variant) => variant.id));
        const missing = colorVariantIds.filter((id) => !activeIds.has(id));
        if (missing.length > 0) {
            throw new ApiError(`These colours were not found or are no longer active: ${missing.join(", ")}.`, 404, "VARIANT_NOT_FOUND");
        }

        const uploaded = await this._mediaUploadService.uploadDesignColorVariantImages(files);

        try {
            await db.transaction(async (tx) => {
                for (const [index, colorVariantId] of colorVariantIds.entries()) {
                    await this._repository.updateVariant(tx, colorVariantId, {
                        imageUrl: uploaded[index].imageUrl,
                        imagePublicId: uploaded[index].imagePublicId,
                    });
                }
            });
        } catch (error) {
            await this._mediaUploadService.deleteUploadedImages(uploaded);
            throw error;
        }

        return {
            updated: colorVariantIds.length,
            photos: colorVariantIds.map((colorVariantId, index) => ({ colorVariantId, imageUrl: uploaded[index].imageUrl })),
        };
    }
}

export default new DesignPhotoService();
