import { db } from "../../../database/index.js";

import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockInDraftRepository from "../repositories/stockInDraft.repository.js";

const RECENT_LIMIT = 5;

// "NONE": the registration never produced a QR label (e.g. loose pieces only, untagged).
// "NOT_PRINTED" / "PARTIAL" / "PRINTED": how many of its ACTIVE labels a print job has covered.
function toPrintStatus(qrCount, printedCount) {
    if (qrCount === 0) return "NONE";
    if (printedCount === 0) return "NOT_PRINTED";
    if (printedCount < qrCount) return "PARTIAL";
    return "PRINTED";
}

function toRecentView(row) {
    return {
        stockInTransactionId: row.stockInTransactionId,
        challanNo: row.challanNo,
        stockDate: row.stockDate,
        createdAt: row.createdAt,
        design: { id: row.designId, code: row.designCode, name: row.designName },
        variant: { id: row.colorVariantId, colorName: row.colorName, colorHex: row.colorHex },
        pieceCount: row.pieceCount,
        qrCount: row.qrCount,
        printedCount: row.printedCount,
        printStatus: toPrintStatus(row.qrCount, row.printedCount),
    };
}

class StockInDashboardService {
    _stockInTransactionRepository = stockInTransactionRepository;
    _stockInDraftRepository = stockInDraftRepository;

    async getDashboard() {
        const [monthTotals, draftCount, pendingPrintCount, recentRows] = await Promise.all([
            this._stockInTransactionRepository.getCurrentMonthTotals(db),
            this._stockInDraftRepository.count(db),
            this._stockInTransactionRepository.countWithUnprintedQr(db),
            this._stockInTransactionRepository.findRecentWithPrintStatus(db, { limit: RECENT_LIMIT }),
        ]);

        return {
            stats: {
                batchesThisMonth: monthTotals.batchCount,
                piecesThisMonth: monthTotals.pieceCount,
                draftsInProgress: draftCount,
                batchesPendingPrint: pendingPrintCount,
            },
            recent: recentRows.map(toRecentView),
        };
    }
}

export default new StockInDashboardService();
