import { randomUUID } from "node:crypto";

import ApiError from "../../../core/apiError.js";

import { db } from "../../../database/index.js";
import designRepository from "../repositories/design.repository.js";
import colorVariantRepository from "../repositories/colorVariant.repository.js";
import designSizeRepository from "../repositories/designSize.repository.js";
import mediaUploadService from "../../../core/media/mediaUploadService.js";

class DesignService {
    _designRepository = designRepository;
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;
    _mediaUploadService = mediaUploadService;

    async registerDesign(data, files = []) {
        const { colorVariants, designSizes = [], ...designData } = data;

        if (colorVariants.length !== files.length) {
            throw new ApiError(
                `Expected exactly one image per color variant: received ${colorVariants.length} variant(s) and ${files.length} image(s).`,
                400,
                "VARIANT_IMAGE_COUNT_MISMATCH"
            );
        }

        // Cloudinary is a separate system from PostgreSQL and can't participate in the
        // db.transaction below — uploading here, before the transaction opens, keeps the
        // transaction free of network I/O and gives us publicIds to clean up on failure.
        const uploadedImages = await this._mediaUploadService.uploadDesignColorVariantImages(files);

        try {
            return await db.transaction(async (tx) => {
                const design = await this._designRepository.create(tx, designData);

                //todo: service knows the persistent structure of color variant introducing some coupling in open/close principle
                const variants = colorVariants.map((color, index) => ({
                    designId: design.id,
                    colorName: color.colorName,
                    colorHex: color.colorHex,
                    imageUrl: uploadedImages[index].imageUrl,
                    imagePublicId: uploadedImages[index].imagePublicId,
                    // qrService isn't implemented yet; a random unique payload satisfies the
                    // NOT NULL constraint without blocking variant creation on this feature
                    qrPayload: randomUUID(),
                    qrGeneratedAt: new Date(),
                }));
                const createdVariants = await this._colorVariantRepository.createMany(tx, variants);

                //todo: service knows the persistent structure of design size introducing some coupling in open/close principle
                // designSizes belong to a color variant (variantId), not the design directly —
                // the same size set is applied to every variant created in this request
                const sizes = createdVariants.flatMap(variant =>
                    designSizes.map(size => ({
                        variantId: variant.id,
                        sizeLabel: size.sizeLabel,
                        displayOrder: size.displayOrder,
                        unsetPricePerSize: size.unsetPricePerSize
                    }))
                );
                const createdSizes = sizes.length > 0
                    ? await this._designSizeRepository.createMany(tx, sizes)
                    : [];

                return { design, colorVariants: createdVariants, designSizes: createdSizes };
            });
        } catch (error) {
            await this._mediaUploadService.deleteUploadedImages(uploadedImages);
            throw error;
        }
    }

    async searchDesign(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError(400, "Search keyword is required.");
        };

        return this._designRepository.search(keyword.trim());
    }
}

export default new DesignService();
