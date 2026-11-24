import ApiError from "../../../core/apiError.js";
import { db } from "../../../database/index.js";
import mediaUploadService from "../../../core/media/mediaUploadService.js";

import designDeleteRepository from "../repositories/designDelete.repository.js";

class DesignDeleteService {
    _repository = designDeleteRepository;
    _mediaUploadService = mediaUploadService;

    // Removes a design that was entered by mistake. Refused as soon as any stock or sales record
    // exists for one of its colour variants; those records must be corrected in Current Stock or
    // the sales screens instead, so no history is lost.
    async deleteDesign(id) {
        const variants = await db.transaction(async (tx) => {
            const design = await this._repository.lockDesign(tx, id);
            if (!design) throw new ApiError("Design not found.", 404, "NOT_FOUND");

            const found = await this._repository.findVariants(tx, id);
            const used = found.length > 0 ? await this._repository.findUsage(tx, found.map((variant) => variant.id)) : [];
            if (used.length > 0) {
                throw new ApiError(
                    `This design can't be deleted because it already has ${used.join(", ")} recorded against it.`,
                    409,
                    "DESIGN_HAS_STOCK",
                );
            }

            await this._repository.delete(tx, id);
            return found;
        });

        // Photos are removed from storage only once the database delete has committed.
        await this._mediaUploadService.deleteUploadedImages(variants);
        return { id };
    }
}

export default new DesignDeleteService();
