import { ApiResponse } from "../../../core/apiResponse.js";
import stockInOverviewService from "../services/stockInOverview.service.js";

class StockInOverviewController {
    get = async (req, res, next) => {
        try {
            const result = await stockInOverviewService.getOverview();
            return res.status(200).json(new ApiResponse(200, result, "Stock In overview fetched successfully."));
        } catch (error) {
            next(error);
        }
    };
}

export default new StockInOverviewController();
