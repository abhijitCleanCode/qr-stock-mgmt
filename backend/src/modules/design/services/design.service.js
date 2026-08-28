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
                        unsetPricePerSize: size.unsetPricePerSize,
                        includedInSet: size.includedInSet,
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

    async getAllDesigns({ page, limit }) {
        const offset = (page - 1) * limit;

        const [designs, total] = await Promise.all([
            this._designRepository.findAll({ limit, offset }),
            this._designRepository.count(),
        ]);

        const variants = await this._colorVariantRepository.findByDesignIds(designs.map((design) => design.id));
        const variantsByDesignId = this._groupVariantsByDesignId(variants);

        // every variant of a design shares the same size set — one representative variant per design is enough
        const representativeVariantIds = designs
            .map((design) => variantsByDesignId[design.id]?.[0]?.id)
            .filter(Boolean);

        const sizes = await this._designSizeRepository.findByVariantIds(representativeVariantIds);
        const sizesByVariantId = sizes.reduce((acc, size) => {
            (acc[size.variantId] ??= []).push(size);
            return acc;
        }, {});

        return {
            data: designs.map((design) => {
                const representativeVariantId = variantsByDesignId[design.id]?.[0]?.id;

                return {
                    ...design,
                    colorVariants: variantsByDesignId[design.id] ?? [],
                    setComposition: sizesByVariantId[representativeVariantId] ?? [],
                };
            }),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async searchDesign(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError("Search keyword is required.", 400);
        };

        const designs = await this._designRepository.search(keyword.trim());

        const variants = await this._colorVariantRepository.findByDesignIds(designs.map((design) => design.id));
        const variantsByDesignId = this._groupVariantsByDesignId(variants);

        return designs.map((design) => ({
            ...design,
            colorVariants: variantsByDesignId[design.id] ?? [],
        }));
    }

    async getActiveVariantSizes(colorVariantId) {
        const variant = await this._colorVariantRepository.findActiveById(db, colorVariantId);
        if (!variant) {
            throw new ApiError(`Color variant ${colorVariantId} not found or inactive.`, 404, "VARIANT_NOT_FOUND");
        }

        return this._designSizeRepository.findActiveByVariantId(db, colorVariantId);
    }

    _groupVariantsByDesignId(variants) {
        return variants.reduce((acc, variant) => {
            (acc[variant.designId] ??= []).push(variant);
            return acc;
        }, {});
    }
}

export default new DesignService();
