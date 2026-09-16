import { randomUUID } from "node:crypto";

import ApiError from "../../../core/apiError.js";

import { db } from "../../../database/index.js";
import designRepository, { normalizeDesignCode } from "../repositories/design.repository.js";
import colorVariantRepository, { normalizeColorName } from "../repositories/colorVariant.repository.js";
import designSizeRepository, { normalizeSizeLabel } from "../repositories/designSize.repository.js";
import jobberRepository from "../repositories/jobber.repository.js";
import qualityRepository from "../repositories/quality.repository.js";
import patternRepository from "../repositories/pattern.repository.js";
import mediaUploadService from "../../../core/media/mediaUploadService.js";

// A field the caller didn't submit (or submitted blank) keeps the existing design's value —
// merging into an existing design is never allowed to blank out information it already has.
const mergeScalar = (existingValue, newValue) =>
    newValue === undefined || newValue === null || newValue === "" ? existingValue : newValue;

class DesignService {
    _designRepository = designRepository;
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;
    _jobberRepository = jobberRepository;
    _qualityRepository = qualityRepository;
    _patternRepository = patternRepository;
    _mediaUploadService = mediaUploadService;

    async registerDesign(data, files = []) {
        const { colorVariants, designSizes = [], jobberId, jobberName, qualityId, quality, patternId, name, code, ...designData } = data;

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
        // Images for colours that turn out to already exist on the matched design are never
        // attached to a row — tracked here so they can be cleaned up from storage after the
        // transaction commits (deleting them on failure is handled by the catch below instead).
        const unusedImages = [];

        try {
            const result = await db.transaction(async (tx) => {
                const resolvedJobberId = await this._resolveJobberId(tx, { jobberId, jobberName });
                const resolvedQuality = await this._resolveQuality(tx, { qualityId, qualityName: quality });
                const resolvedPattern = await this._resolvePattern(tx, { patternId, patternName: name });
                const normalizedCode = normalizeDesignCode(code);

                // Design identity = same pattern + same code (see DesignRepository.findByIdentity).
                // Found → merge into it; not found → create it, exactly as before.
                const existingDesign = await this._designRepository.findByIdentity(tx, {
                    patternId: resolvedPattern.id,
                    normalizedCode,
                });

                const mergeInto = async (target) => this._designRepository.update(tx, target.id, {
                    itemName: mergeScalar(target.itemName, designData.itemName),
                    defaultSellingPricePerPiece: mergeScalar(target.defaultSellingPricePerPiece, designData.defaultSellingPricePerPiece),
                    notes: mergeScalar(target.notes, designData.notes),
                    jobberId: resolvedJobberId ?? target.jobberId,
                    qualityId: resolvedQuality.id,
                    quality: resolvedQuality.name,
                });

                let design;
                let isNewDesign;

                if (existingDesign) {
                    design = await mergeInto(existingDesign);
                    isNewDesign = false;
                } else {
                    // Race-safe: if another request creates this same (pattern, code) design
                    // between our findByIdentity above and this insert, the unique index rejects
                    // it and we merge into the row the other request just committed instead of
                    // erroring or duplicating (see DesignRepository.createOrFindExisting).
                    const { row, wasCreated } = await this._designRepository.createOrFindExisting(tx, {
                        ...designData,
                        code,
                        normalizedCode,
                        jobberId: resolvedJobberId,
                        qualityId: resolvedQuality.id,
                        quality: resolvedQuality.name,
                        patternId: resolvedPattern.id,
                        name: resolvedPattern.name,
                    });

                    design = wasCreated ? row : await mergeInto(row);
                    isNewDesign = wasCreated;
                }

                //todo: service knows the persistent structure of color variant introducing some coupling in open/close principle
                // existingVariants accumulates newly-created variants too, so a duplicate colour
                // submitted twice in the same request also merges instead of creating a second row.
                const existingVariants = isNewDesign ? [] : await this._colorVariantRepository.findActiveByDesignId(tx, design.id);

                const variants = [];
                for (const [index, color] of colorVariants.entries()) {
                    const normalizedColorName = normalizeColorName(color.colorName);
                    const matchedVariant = existingVariants.find((variant) => variant.normalizedColorName === normalizedColorName);

                    if (matchedVariant) {
                        unusedImages.push(uploadedImages[index]);
                        variants.push(matchedVariant);
                        continue;
                    }

                    const [createdVariant] = await this._colorVariantRepository.createMany(tx, [{
                        designId: design.id,
                        colorName: color.colorName,
                        colorHex: color.colorHex,
                        normalizedColorName,
                        imageUrl: uploadedImages[index].imageUrl,
                        imagePublicId: uploadedImages[index].imagePublicId,
                        // qrService isn't implemented yet; a random unique payload satisfies the
                        // NOT NULL constraint without blocking variant creation on this feature
                        qrPayload: randomUUID(),
                        qrGeneratedAt: new Date(),
                    }]);
                    existingVariants.push(createdVariant);
                    variants.push(createdVariant);
                }

                //todo: service knows the persistent structure of design size introducing some coupling in open/close principle
                // designSizes belong to a color variant (variantId), not the design directly — the
                // same size set is applied to every variant of the design (new or pre-existing), so
                // sizes stay in sync across colours; already-present labels are left untouched.
                const targetVariantIds = existingVariants.map((variant) => variant.id);
                const currentSizes = designSizes.length > 0
                    ? await this._designSizeRepository.findAllByVariantIds(tx, targetVariantIds)
                    : [];
                const currentLabelsByVariantId = currentSizes.reduce((acc, size) => {
                    (acc[size.variantId] ??= new Set()).add(normalizeSizeLabel(size.sizeLabel));
                    return acc;
                }, {});

                const newSizeRows = targetVariantIds.flatMap((variantId) => {
                    const currentLabels = currentLabelsByVariantId[variantId] ?? new Set();

                    return designSizes
                        .filter((size) => !currentLabels.has(normalizeSizeLabel(size.sizeLabel)))
                        .map((size) => ({
                            variantId,
                            sizeLabel: size.sizeLabel,
                            displayOrder: size.displayOrder,
                            unsetPricePerSize: size.unsetPricePerSize,
                            includedInSet: size.includedInSet,
                        }));
                });
                const createdSizes = newSizeRows.length > 0
                    ? await this._designSizeRepository.createMany(tx, newSizeRows)
                    : [];

                return { design, colorVariants: variants, designSizes: createdSizes, isNewDesign };
            });

            if (unusedImages.length > 0) {
                await this._mediaUploadService.deleteUploadedImages(unusedImages);
            }

            return result;
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

    async searchJobbers(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError("Search keyword is required.", 400);
        }

        return this._jobberRepository.search(keyword.trim());
    }

    // Backend stays authoritative: an incoming jobberId is only trusted if it still resolves to
    // a real row (it may be stale if the jobber was resolved from a search result that's since
    // been superseded); a name with no id is resolved/created by name. Runs inside the caller's
    // transaction so a newly created jobber is rolled back along with the rest of the design if
    // anything downstream fails.
    async _resolveJobberId(tx, { jobberId, jobberName }) {
        if (jobberId) {
            const existing = await this._jobberRepository.findById(tx, jobberId);
            if (existing) return existing.id;
        }

        if (jobberName?.trim()) {
            const jobber = await this._jobberRepository.findOrCreate(tx, jobberName.trim());
            return jobber.id;
        }

        return null;
    }

    async searchQualities(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError("Search keyword is required.", 400);
        }

        return this._qualityRepository.search(keyword.trim());
    }

    // Mirrors _resolveJobberId, but quality is required on register (unlike jobber): the
    // validator guarantees qualityName is a non-blank string, so this always resolves to a
    // real row. Returns both id and name — name is stored denormalized on the design row
    // alongside qualityId (see registerDesign).
    async _resolveQuality(tx, { qualityId, qualityName }) {
        if (qualityId) {
            const existing = await this._qualityRepository.findById(tx, qualityId);
            if (existing) return existing;
        }

        return this._qualityRepository.findOrCreate(tx, qualityName.trim());
    }

    async searchPatterns(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError("Search keyword is required.", 400);
        }

        return this._patternRepository.search(keyword.trim());
    }

    // Mirrors _resolveQuality — pattern (the design "name", e.g. Anarkali/Straight/Flair) is
    // required on register, so this always resolves to a real row. Returns both id and name —
    // name is stored denormalized on the design row alongside patternId (see registerDesign).
    async _resolvePattern(tx, { patternId, patternName }) {
        if (patternId) {
            const existing = await this._patternRepository.findById(tx, patternId);
            if (existing) return existing;
        }

        return this._patternRepository.findOrCreate(tx, patternName.trim());
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
