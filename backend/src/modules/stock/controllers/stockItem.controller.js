import ApiError from "../../../core/apiError.js";
import { ApiResponse } from "../../../core/apiResponse.js";
import stockItemService from "../services/stockItem.service.js";

class StockItemController {
    _stockItemService = stockItemService;

    updateStatus = async (req, res, next) => {
        const id = Number(req.params.id);
        const { status: targetStatus } = req.body;

        try {
            if (!Number.isInteger(id) || id <= 0) {
                throw new ApiError("Invalid stock item id.", 400, "VALIDATION_ERROR");
            }

            const result = await this._stockItemService.transitionStatus(id, targetStatus);
            return res.status(200).json(new ApiResponse(200, result, "Stock item status updated."));
        } catch (error) {
            next(error);
        }
    }

    assembleSet = async (req, res, next) => {
        const { colorVariantId } = req.body;

        try {
            const result = await this._stockItemService.assembleSet(colorVariantId);

            return res.status(201).json(new ApiResponse(201, result, "Loose pieces assembled into a new SET."));
        } catch (error) {
            next(error);
        }
    };

    assembleBundle = async (req, res, next) => {
        const { colorVariantId, composition } = req.body;

        try {
            const result = await this._stockItemService.assembleBundle(colorVariantId, composition);

            return res.status(201).json(new ApiResponse(201, result, "Loose pieces assembled into a new BUNDLE."));
        } catch (error) {
            next(error);
        }
    };
}

export default new StockItemController();
