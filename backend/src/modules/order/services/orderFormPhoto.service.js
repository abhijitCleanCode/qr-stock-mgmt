import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";
import mediaUploadService from "../../../core/media/mediaUploadService.js";
import fileStorageProvider from "../../../core/storage/fileStorage.provider.js";

import orderFormRepository from "../repositories/orderForm.repository.js";
import orderFormPhotoRepository from "../repositories/orderFormPhoto.repository.js";
import orderFormMapper, { parseOrderFormNumber } from "../mapper/orderFormMapper.js";
import orderFormService from "./orderForm.service.js";

class OrderFormPhotoService {
    _orderFormRepository = orderFormRepository;
    _orderFormPhotoRepository = orderFormPhotoRepository;
    _mediaUploadService = mediaUploadService;
    _fileStorageProvider = fileStorageProvider;
    _orderFormMapper = orderFormMapper;
    _orderFormService = orderFormService;

    async _requireOrderForm(runner, orderFormId) {
        const orderForm = await this._orderFormRepository.findById(runner, orderFormId);
        if (!orderForm) {
            throw new ApiError(`Order form ${orderFormId} not found.`, 404, "ORDER_FORM_NOT_FOUND");
        }
        return orderForm;
    }

    async listPhotos(orderFormId) {
        await this._requireOrderForm(db, orderFormId);

        const photos = await this._orderFormPhotoRepository.findByOrderFormId(db, orderFormId);
        return {
            photos: photos.map((photo) => this._orderFormMapper.mapPhoto(photo)),
            count: photos.length,
        };
    }

    async uploadPhotos(orderFormId, files) {
        await this._requireOrderForm(db, orderFormId);

        if (!files || files.length === 0) {
            throw new ApiError("Select at least one photo to upload.", 400, "NO_FILES_PROVIDED");
        }

        // Same two-phase approach as Design's registerDesign — Cloudinary can't join the DB
        // transaction, so upload first and roll the assets back if persistence fails.
        const uploadedImages = await this._mediaUploadService.uploadOrderFormPhotos(files);

        try {
            const rows = uploadedImages.map((image) => ({
                orderFormId,
                imageUrl: image.imageUrl,
                imagePublicId: image.imagePublicId,
            }));

            await db.transaction(async (tx) => {
                await this._orderFormPhotoRepository.createMany(tx, rows);
            });
        } catch (error) {
            await this._mediaUploadService.deleteUploadedImages(uploadedImages);
            throw error;
        }

        return this.listPhotos(orderFormId);
    }

    async deletePhoto(orderFormId, photoId) {
        await this._requireOrderForm(db, orderFormId);

        const photo = await this._orderFormPhotoRepository.findByIdAndOrderFormId(db, photoId, orderFormId);
        if (!photo) {
            throw new ApiError(`Photo ${photoId} not found for this order form.`, 404, "ORDER_FORM_PHOTO_NOT_FOUND");
        }

        await db.transaction(async (tx) => {
            await this._orderFormPhotoRepository.deleteById(tx, photo.id);
        });

        // A DESIGN-sourced row points at the color variant's own asset, not a copy this
        // gallery owns — destroying it here would delete the image out from under the design
        // (and every other order form that references the same variant). Only an UPLOADED
        // photo's asset belongs solely to this gallery entry.
        if (photo.source === "UPLOADED") {
            await this._fileStorageProvider.destroy(photo.imagePublicId);
        }

        return this.listPhotos(orderFormId);
    }

    async getDownloadAllUrl(orderFormId) {
        const orderForm = await this._requireOrderForm(db, orderFormId);

        const photos = await this._orderFormPhotoRepository.findByOrderFormId(db, orderFormId);
        if (photos.length === 0) {
            throw new ApiError("This order form has no photos to download.", 400, "NO_PHOTOS_TO_DOWNLOAD");
        }

        const orderFormNumber = this._orderFormMapper.mapDetail(orderForm, []).orderFormNumber;
        const url = this._fileStorageProvider.createZipDownloadUrl(
            photos.map((photo) => photo.imagePublicId),
            orderFormNumber
        );

        return { url };
    }

    // Backs the WhatsApp share link's target page — a read-only, publicly reachable view of
    // the order form keyed by its human-readable number so no internal id ever appears in a
    // link shared outside the app.
    async getSharedOrderForm(orderFormNumber) {
        const orderFormId = parseOrderFormNumber(orderFormNumber);
        if (!orderFormId) {
            throw new ApiError(`Order form ${orderFormNumber} not found.`, 404, "ORDER_FORM_NOT_FOUND");
        }

        const [detail, photos] = await Promise.all([
            this._orderFormService.getOrderFormDetail(orderFormId),
            this.listPhotos(orderFormId),
        ]);

        return { ...detail, photos: photos.photos, photoCount: photos.count };
    }
}

export default new OrderFormPhotoService();
