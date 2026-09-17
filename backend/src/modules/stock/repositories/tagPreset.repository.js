import { eq } from "drizzle-orm";

import { tagPreset } from "../schemas/tagPreset.schema.js";
import { design } from "../../design/schemas/design.schema.js";
import { printer } from "../schemas/printer.schema.js";

class TagPresetRepository {
    // QR Center reference/Library accordion: every preset with its design code and (nullable)
    // default printer name resolved, so the frontend never has to cross-reference printers
    // itself.
    async findAllWithContext(tx) {
        return tx.select({
            designId: tagPreset.designId,
            designCode: design.code,
            presetName: tagPreset.presetName,
            mediaSize: tagPreset.mediaSize,
            defaultPrinterName: printer.name,
        }).from(tagPreset)
            .innerJoin(design, eq(tagPreset.designId, design.id))
            .leftJoin(printer, eq(tagPreset.defaultPrinterId, printer.id));
    }
}

export default new TagPresetRepository();
