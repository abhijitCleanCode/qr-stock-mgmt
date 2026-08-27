import { and, eq, getTableColumns, inArray } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { colorVariant } from "../schemas/colorVariant.schema.js";
import { design } from "../schemas/design.schema.js";

class ColorVariantRepository {
    async createMany(tx, data) {
        return tx.insert(colorVariant).values(data).returning();
    }

    async findByDesignIds(designIds) {
        if (designIds.length === 0) return [];

        return db.select({
            id: colorVariant.id,
            designId: colorVariant.designId,
            colorName: colorVariant.colorName,
            colorHex: colorVariant.colorHex,
        }).from(colorVariant)
            .where(and(inArray(colorVariant.designId, designIds), eq(colorVariant.isActive, true)));
    }

    async findActiveById(tx, id) {
        const [result] = await tx.select({
            ...getTableColumns(colorVariant),
            designCode: design.code,
            designName: design.name,
        }).from(colorVariant)
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(and(eq(colorVariant.id, id), eq(colorVariant.isActive, true)))
            .limit(1);

        return result;
    }
}

export default new ColorVariantRepository();
