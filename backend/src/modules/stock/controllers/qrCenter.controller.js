import qrCenterService from "../services/qrCenter.service.js";
import { ApiResponse } from "../../../core/apiResponse.js";

class QrCenterController {
    _qrCenterService = qrCenterService;

    list = async (req, res, next) => {
        try {
            const response = await this._qrCenterService.listEligibleStock(req.validatedQuery);

            return res.status(200).json(new ApiResponse(200, response.data, "QR-eligible stock fetched successfully.", response.meta));
        } catch (error) {
            next(error);
        }
    };

    generate = async (req, res, next) => {
        const { stockItemIds } = req.body;

        try {
            const response = await this._qrCenterService.generateForStockItemIds(stockItemIds);

            return res.status(200).json(new ApiResponse(200, response, "QR codes generated."));
        } catch (error) {
            next(error);
        }
    };
}

export default new QrCenterController();
