import { ApiResponse } from "../../../core/apiResponse.js";
import stockOutService from "../services/stockOut.service.js";

class StockOutController {
    _stockOutService = stockOutService;

    registerStockOut = async (req, res, next) => {
        try {
            const result = await this._stockOutService.registerStockOut(req.body);
            return res.status(201).json(new ApiResponse(201, result, "Stock out registered successfully."));
        } catch (error) {
            next(error);
        }
    };
}

export default new StockOutController();
