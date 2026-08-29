import currentStockService from "../services/currentStock.service.js";
import { ApiResponse } from "../../../core/apiResponse.js";

class CurrentStockController {
    _currentStockService = currentStockService;

    getCurrentStockSummary = async (req, res, next) => {
        try {
            const response = await this._currentStockService.getCurrentStockSummary(req.validatedQuery);

            return res.status(200).json(new ApiResponse(200, response.data, "Current stock fetched successfully.", response.meta));
        } catch (error) {
            next(error);
        }
    };

    getCurrentStockDetail = async (req, res, next) => {
        const { colorVariantId } = req.params;

        try {
            const response = await this._currentStockService.getCurrentStockDetail(colorVariantId);

            return res.status(200).json(new ApiResponse(200, response, "Current stock detail fetched successfully."));
        } catch (error) {
            next(error);
        }
    };
}

export default new CurrentStockController();
