import qrCenterService from "../services/qrCenter.service.js";
import { ApiResponse } from "../../../core/apiResponse.js";

class QrCenterController {
    _qrCenterService = qrCenterService;

    list = async (req, res, next) => {
        try {
            const response = await this._qrCenterService.listRegistrations(req.validatedQuery);

            return res.status(200).json(new ApiResponse(200, response.data, "Stock registrations fetched successfully.", response.meta));
        } catch (error) {
            next(error);
        }
    };

    getDetail = async (req, res, next) => {
        const { stockInTransactionId } = req.params;

        try {
            const response = await this._qrCenterService.getRegistrationDetail({
                registrationType: "STOCK_IN",
                registrationId: stockInTransactionId,
            });

            return res.status(200).json(new ApiResponse(200, response, "Stock registration QRs fetched successfully."));
        } catch (error) {
            next(error);
        }
    };

    getTransformationDetail = async (req, res, next) => {
        const { transformationId } = req.params;

        try {
            const response = await this._qrCenterService.getRegistrationDetail({
                registrationType: "TRANSFORMATION",
                registrationId: transformationId,
            });

            return res.status(200).json(new ApiResponse(200, response, "Stock transformation QRs fetched successfully."));
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
