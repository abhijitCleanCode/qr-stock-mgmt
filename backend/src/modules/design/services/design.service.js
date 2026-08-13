import ApiError from "../../../core/apiError.js";

import { db } from "../../../database/index.js";
import designRepository from "../repositories/design.repository.js";
import colorVariantRepository from "../repositories/colorVariant.repository.js";
import designSizeRepository from "../repositories/designSize.repository.js";

class DesignService {
    _designRepository = designRepository;
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;

    async registerDesign(data) {
        const { colorVariants, designSizes, ...designData } = data;

        await db.transaction(async (tx) => {
            const design = await this._designRepository.create(tx, designData);

            //todo: service knows the persistent structure of color variant introducing some coupling in open/close principle
            const variants = colorVariants.map(color => ({
                designId: design.id,
                colorName: color.colorName,
                colorHex: color.colorHex,
                // qrPayload: this.qrService.generate(),
                // qrGeneratedAt: new Date()
            }));
            const createdVariants = await this._colorVariantRepository.createMany(tx, variants);

            //todo: service knows the persistent structure of design size introducing some coupling in open/close principle
            const sizes = designSizes.map(size => ({
                designId: createdDesign.id,
                sizeLabel: size.sizeLabel,
                displayOrder: size.displayOrder,
                unsetPricePerSize: size.unsetPricePerSize
            }));
            const createdSizes = await this.designSizeRepository.createMany(tx, sizes);

            return { design, colorVariants: createdVariants, designSizes: createdSizes };
        });
    }

    async searchDesign(keyword) {
        if (!keyword?.trim()) {
            throw new ApiError(400, "Search keyword is required.");
        };

        return this._designRepository.search(keyword.trim());
    }
}

export default new DesignService();
