import { design } from "../schemas/design.schema.js";

class DesignRepository {
    async create(tx, data) {
        const [result] = await tx
            .insert(design)
            .values(data)
            .returning();

        return result;
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
