import { designSize } from "../schemas/designSize.schema.js";

class DesignSize {
    async createMany(tx, data) {
        return tx.insert(designSize).values(data);
    }
}

export default new DesignSize();