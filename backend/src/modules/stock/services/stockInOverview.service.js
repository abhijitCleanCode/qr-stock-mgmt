import stockInDashboardService from "./stockInDashboard.service.js";
import stockInDraftService from "./stockInDraft.service.js";
import stockInChallanService from "./stockInChallan.service.js";

// The first screen of Stock In, in one response: the dashboard figures, the saved drafts, the next
// serial number, and the first page of the challan register (its default view: active, newest first).
// Each part comes from the same service the single endpoints use, so the numbers are identical —
// the page just stops making a separate round trip for each of them.
const REGISTER_FIRST_PAGE = { status: "active", page: 1, limit: 8 };

class StockInOverviewService {
    async getOverview() {
        const [dashboard, drafts, nextSerial, challans] = await Promise.all([
            stockInDashboardService.getDashboard(),
            stockInDraftService.list(),
            stockInChallanService.nextSerial(),
            stockInChallanService.list({ ...REGISTER_FIRST_PAGE }),
        ]);

        return { dashboard, drafts, nextSerial: { serial: nextSerial }, challans };
    }
}

export default new StockInOverviewService();
