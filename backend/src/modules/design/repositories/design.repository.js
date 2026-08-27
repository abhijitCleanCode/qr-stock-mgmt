import { count, desc } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { design } from "../schemas/design.schema.js";

class DesignRepository {
    async create(tx, data) {
        const [result] = await tx.insert(design).values(data).returning();

        return result;
    }

    async findAll({ limit, offset }) {
        return db
            .select()
            .from(design)
            .orderBy(desc(design.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async count() {
        const [result] = await db.select({ value: count() }).from(design);

        return result.value;
    }

    async search(keyword) {
        return await db
            .select({ id: design.id, code: design.code, name: design.name })
            .from(design)
            .where(or(ilike(design.code, `%${keyword}%`), ilike(design.name, `%${keyword}%`)))
            .limit(20);
    }
}

export default new DesignRepository();
