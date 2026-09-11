import { ApiResponse } from "../../../core/apiResponse.js";
import orderFormService from "../services/orderForm.service.js";

class OrderFormController {
    _orderFormService = orderFormService;

    createOrderForm = async (req, res, next) => {
        try {
            const result = await this._orderFormService.createOrderForm(req.body);
            return res.status(201).json(new ApiResponse(201, result, "Order form created successfully."));
        } catch (error) {
            next(error);
        }
    };

    updateOrderForm = async (req, res, next) => {
        try {
            const result = await this._orderFormService.updateOrderForm(req.params.id, req.body);
            return res.status(200).json(new ApiResponse(200, result, "Order form updated successfully."));
        } catch (error) {
            next(error);
        }
    };

    updateStatus = async (req, res, next) => {
        try {
            const result = await this._orderFormService.updateStatus(req.params.id, req.body.status);
            return res.status(200).json(new ApiResponse(200, result, "Order form status updated."));
        } catch (error) {
            next(error);
        }
    };

    getOrderFormDetail = async (req, res, next) => {
        try {
            const result = await this._orderFormService.getOrderFormDetail(req.params.id);
            return res.status(200).json(new ApiResponse(200, result, "Order form fetched successfully."));
        } catch (error) {
            next(error);
        }
    };

    listOrderForms = async (req, res, next) => {
        try {
            const response = await this._orderFormService.listOrderForms(req.validatedQuery);
            return res.status(200).json(new ApiResponse(200, response.data, "Order forms fetched successfully.", response.meta));
        } catch (error) {
            next(error);
        }
    };
}

export default new OrderFormController();
