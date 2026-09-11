import orderFormPhotoRepository from "../repositories/orderFormPhoto.repository.js";
import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";

// Keeps the Item Photos Gallery in sync with whichever variants are currently on the order
// form: every distinct variant gets its own registered image added to the gallery once, the
// moment it's saved onto the order form. Deliberately standalone (depends on neither
// orderForm.service nor orderFormPhoto.service) so it can be called from orderForm.service's
// create/update transaction without a circular import.
class OrderFormPhotoSyncService {
    _orderFormPhotoRepository = orderFormPhotoRepository;
    _colorVariantRepository = colorVariantRepository;

    // Must run inside the same transaction as the item writes it follows, so a photo insert
    // never commits without the item that justified it (or vice versa).
    async syncDesignPhotos(tx, orderFormId, colorVariantIds) {
        const uniqueIds = [...new Set(colorVariantIds)];
        if (uniqueIds.length === 0) return;

        const alreadySynced = new Set(
            await this._orderFormPhotoRepository.findExistingDesignPhotoVariantIds(tx, orderFormId, uniqueIds)
        );
        const missingIds = uniqueIds.filter((id) => !alreadySynced.has(id));
        if (missingIds.length === 0) return;

        const variants = await this._colorVariantRepository.findByIds(tx, missingIds);

        const rows = variants
            .filter((variant) => variant.imageUrl && variant.imagePublicId)
            .map((variant) => ({
                orderFormId,
                imageUrl: variant.imageUrl,
                imagePublicId: variant.imagePublicId,
                source: "DESIGN",
                colorVariantId: variant.id,
            }));

        await this._orderFormPhotoRepository.createMany(tx, rows);
    }
}

export default new OrderFormPhotoSyncService();
