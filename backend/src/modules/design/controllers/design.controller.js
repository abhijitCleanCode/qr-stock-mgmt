import designService from "../service/design.service.js";

class DesignController {
    _designService = designService;

    RegisterDesign = async (req, res, next) => {
        try {
            const response = await this._designService.registerDesign(req.body);

            return res.status(200).json(new ApiResponse(201, response, "Design registered successfully."));
        } catch (error) {
            next(error);
        }
    };

    searchDesign = async (req, res, next) => {
        const { keyword } = req.query;

        try {
            await this._designService.searchDesign(keyword?.trim());
        } catch (error) {
            next(error);
        }
    }
}

export default new DesignController();