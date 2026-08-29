import { and, count, desc, eq, getTableColumns, ilike, inArray, or } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { colorVariant } from "../schemas/colorVariant.schema.js";
import { design } from "../schemas/design.schema.js";

// Shared by findAll/count below so the row set behind the page and behind the total always agree.
function buildActiveWithDesignConditions(keyword) {
    const conditions = [eq(colorVariant.isActive, true)];

    if (keyword) {
        conditions.push(or(ilike(design.code, `%${keyword}%`), ilike(design.name, `%${keyword}%`)));
    }

    return and(...conditions);
}

class ColorVariantRepository {
    async createMany(tx, data) {
        return tx.insert(colorVariant).values(data).returning();
    }

    // Design + Color Variant rows for the Current Stock summary — every active variant is
    // included regardless of whether it has any variant_inventory rows yet (same "list every
    // active row" convention as findByDesignIds/findActiveById), so out-of-stock variants still show up.
    async findAll({ limit, offset, keyword }) {
        return db.select({
            colorVariantId: colorVariant.id,
            colorName: colorVariant.colorName,
            colorHex: colorVariant.colorHex,
            imageUrl: colorVariant.imageUrl,
            designId: design.id,
            designCode: design.code,
            designName: design.name,
        }).from(colorVariant)
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(buildActiveWithDesignConditions(keyword))
            .orderBy(desc(colorVariant.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async count({ keyword }) {
        const [result] = await db.select({ value: count() })
            .from(colorVariant)
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(buildActiveWithDesignConditions(keyword));

        return result.value;
    }

    async findByDesignIds(designIds) {
        if (designIds.length === 0) return [];

        return db.select({
            id: colorVariant.id,
            designId: colorVariant.designId,
            colorName: colorVariant.colorName,
            colorHex: colorVariant.colorHex,
            imageUrl: colorVariant.imageUrl,
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
