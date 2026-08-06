import { colorVariant } from "../schemas/colorVariant.schema.js";

class ColorVariantRepository {
    async createMany(tx, data) {
        return tx.insert(colorVariant).values(variants);
    }
}

export default new ColorVariantRepository();
