import { db } from "../../../database/index.js";
import designRepository from "../repositories/design.repository.js";
import colorVariantRepository from "../repositories/colorVariant.repository.js";

class DesignService {
    _designRepository = designRepository;
    _colorVariantRepository = colorVariantRepository;

    async registerDesign(data) {
        const { colorVariants, designSizes, ...designData } = data;

        await db.transaction(async (tx) => {
            const design = await this._designRepository.create(tx, designData);

            const variants = colorVariants.map(color => ({
                designId: design.id,
                colorName: color.colorName,
                colorHex: color.colorHex,
                // qrPayload: this.qrService.generate(),
                // qrGeneratedAt: new Date()
            }));

            await this._colorVariantRepository.createMany(tx, variants);

            const sizes = designSizes.map(size => ({
                designId: createdDesign.id,
                sizeLabel: size.sizeLabel,
                displayOrder: size.displayOrder,
                unsetPricePerSize: size.unsetPricePerSize
            }));

            await this.designSizeRepository.createMany(tx, sizes);
        });
    }

    async searchDesign(keyword) {
        if (!keyword) {
            throw new Error("Search keyword is required.");
        };

         return await this._designRepository.search(keyword);
    }
}

export default new DesignService();
