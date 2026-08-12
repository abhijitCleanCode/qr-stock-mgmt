import { and, asc, eq } from "drizzle-orm";
import { designSize } from "../schemas/designSize.schema.js";

class DesignSize {
    async createMany(tx, data) {
        return tx.insert(designSize).values(data);
    }

    async findActiveByVariantId(tx, variantId) {
        return tx
            .select()
            .from(designSize)
            .where(and(eq(designSize.variantId, variantId), eq(designSize.isActive, true)))
            .orderBy(asc(designSize.displayOrder));
    }
}

export default new DesignSize();