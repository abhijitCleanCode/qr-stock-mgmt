import { and, eq } from "drizzle-orm";
import { colorVariant } from "../schemas/colorVariant.schema.js";

class ColorVariantRepository {
    async createMany(tx, data) {
        return tx.insert(colorVariant).values(data).returning();
    }

    async findActiveById(tx, id) {
        const [result] = await tx.select().from(colorVariant).where(and(eq(colorVariant.id, id), eq(colorVariant.isActive, true))).limit(1);

        return result;
    }
}

export default new ColorVariantRepository();
