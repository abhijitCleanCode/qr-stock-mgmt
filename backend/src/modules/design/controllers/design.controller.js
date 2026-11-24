import designService from "../services/design.service.js";
import designMasterService from "../services/designMaster.service.js";
import designBulkPreviewService from "../services/designBulkPreview.service.js";
import designDeleteService from "../services/designDelete.service.js";
import { ApiResponse } from "../../../core/apiResponse.js";

class DesignController {
    _designService = designService;
    _designMasterService = designMasterService;
    _designBulkPreviewService = designBulkPreviewService;
    _designDeleteService = designDeleteService;

    // Deletes a design entered by mistake. Refused (409) once stock or sales exist for it.
    deleteDesign = async (req, res, next) => {
        try {
            const response = await this._designDeleteService.deleteDesign(req.params.id);

            return res.status(200).json(new ApiResponse(200, response, "Design deleted."));
        } catch (error) {
            next(error);
        }
    };

    // Bulk import preview (Design Master): read-only check of the designs in a CSV file.
    bulkPreview = async (req, res, next) => {
        try {
            const response = await this._designBulkPreviewService.preview(req.body.designs);

            return res.status(200).json(new ApiResponse(200, response, "Bulk import preview ready."));
        } catch (error) {
            next(error);
        }
    };

    RegisterDesign = async (req, res, next) => {
        const files = req.files ?? [];

        try {
            const response = await this._designService.registerDesign(req.body, files);

            const message = response.isNewDesign
                ? "Design registered successfully."
                : "Design code already exists — new colour variant added to the existing design.";

            return res.status(200).json(new ApiResponse(201, response, message));
        } catch (error) {
            next(error);
        }
    };

    getAllDesigns = async (req, res, next) => {
        try {
            // Design Master dashboard list: search/sort + jobber name (a superset of the old shape).
            const response = await this._designMasterService.listDesigns(req.validatedQuery);

            return res.status(200).json(new ApiResponse(200, response.data, "Designs fetched successfully.", response.meta));
        } catch (error) {
            next(error);
        }
    };

    getDesign = async (req, res, next) => {
        try {
            const response = await this._designMasterService.getDesign(req.params.id);
            return res.status(200).json(new ApiResponse(200, response, "Design fetched successfully."));
        } catch (error) {
            next(error);
        }
    };

    updateDesign = async (req, res, next) => {
        try {
            const response = await this._designMasterService.updateDesign(req.params.id, req.body, req.files ?? []);
            return res.status(200).json(new ApiResponse(200, response, "Design updated successfully."));
        } catch (error) {
            next(error);
        }
    };

    searchDesign = async (req, res, next) => {
        const { keyword } = req.validatedQuery;

        try {
            const response = await this._designService.searchDesign(keyword);

            return res.status(200).json(new ApiResponse(200, response, "Designs fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    searchJobbers = async (req, res, next) => {
        const { keyword } = req.validatedQuery;

        try {
            const response = await this._designService.searchJobbers(keyword);

            return res.status(200).json(new ApiResponse(200, response, "Jobbers fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    searchQualities = async (req, res, next) => {
        const { keyword } = req.validatedQuery;

        try {
            const response = await this._designService.searchQualities(keyword);

            return res.status(200).json(new ApiResponse(200, response, "Qualities fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    getItemNames = async (req, res, next) => {
        try {
            const response = await this._designService.getItemNames();

            return res.status(200).json(new ApiResponse(200, response, "Item names fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    searchPatterns = async (req, res, next) => {
        const { keyword } = req.validatedQuery;

        try {
            const response = await this._designService.searchPatterns(keyword);

            return res.status(200).json(new ApiResponse(200, response, "Patterns fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    getActiveVariantSizes = async (req, res, next) => {
        const { colorVariantId } = req.params;

        try {
            const response = await this._designService.getActiveVariantSizes(colorVariantId);

            return res.status(200).json(new ApiResponse(200, response, "Active sizes fetched successfully."));
        } catch (error) {
            next(error);
        }
    }

    getVariantSemiSets = async (req, res, next) => {
        const { colorVariantId } = req.params;

        try {
            const response = await this._designService.getVariantSemiSets(colorVariantId);

            return res.status(200).json(new ApiResponse(200, response, "Semi sets fetched successfully."));
        } catch (error) {
            next(error);
        }
    }
}

export default new DesignController();
