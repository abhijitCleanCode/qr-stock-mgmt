import { ApiResponse } from "../../../core/apiResponse.js";
import orderFormPhotoService from "../services/orderFormPhoto.service.js";

class OrderFormPhotoController {
    _orderFormPhotoService = orderFormPhotoService;

    listPhotos = async (req, res, next) => {
        try {
            const result = await this._orderFormPhotoService.listPhotos(req.params.id);
            return res.status(200).json(new ApiResponse(200, result, "Order form photos fetched successfully."));
        } catch (error) {
            next(error);
        }
    };

    uploadPhotos = async (req, res, next) => {
        try {
            const result = await this._orderFormPhotoService.uploadPhotos(req.params.id, req.files ?? []);
            return res.status(201).json(new ApiResponse(201, result, "Photos uploaded successfully."));
        } catch (error) {
            next(error);
        }
    };

    deletePhoto = async (req, res, next) => {
        try {
            const result = await this._orderFormPhotoService.deletePhoto(req.params.id, req.params.photoId);
            return res.status(200).json(new ApiResponse(200, result, "Photo deleted successfully."));
        } catch (error) {
            next(error);
        }
    };

    getDownloadAllUrl = async (req, res, next) => {
        try {
            const result = await this._orderFormPhotoService.getDownloadAllUrl(req.params.id);
            return res.status(200).json(new ApiResponse(200, result, "Download link generated successfully."));
        } catch (error) {
            next(error);
        }
    };

    getSharedOrderForm = async (req, res, next) => {
        try {
            const result = await this._orderFormPhotoService.getSharedOrderForm(req.params.orderFormNumber);
            return res.status(200).json(new ApiResponse(200, result, "Order form fetched successfully."));
        } catch (error) {
            next(error);
        }
    };
}

export default new OrderFormPhotoController();
