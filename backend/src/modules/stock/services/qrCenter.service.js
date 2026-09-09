import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import stockItemRepository from "../repositories/stockItem.repository.js";
import stockItemQrRepository from "../repositories/stockItemQr.repository.js";
import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockQrService from "./stockQr.service.js";

// findByStockItemIds returns rows newest-first — keep only the first (latest) row per
// stock item so a stock item with QR "history" (see stockItemQr.schema.js) still resolves
// to a single current QR everywhere in this service.
function latestQrByStockItemId(qrRows) {
    const map = new Map();
    for (const row of qrRows) {
        if (!map.has(row.stockItemId)) map.set(row.stockItemId, row);
    }
    return map;
}

function toQrView(qrRow) {
    if (!qrRow) return null;
    return { generatedAt: qrRow.generatedAt, payload: qrRow.payload };
}

// eligibleItemCount vs qrGeneratedCount only ever disagrees if QR generation was interrupted
// before this registration's stock-in transaction committed (impossible — see
// stockIn.service.js, which generates QRs in the same transaction as the stock items
// themselves) or a stock item is still mid-backfill via the manual /qr-center/generate path.
// Kept as a real comparison rather than hardcoded "READY" so that edge case still surfaces.
function toRegistrationView(row) {
    return {
        stockInTransactionId: row.stockInTransactionId,
        stockDate: row.stockDate,
        createdAt: row.createdAt,
        design: {
            id: row.designId,
            code: row.designCode,
            name: row.designName,
        },
        variant: {
            id: row.colorVariantId,
            colorName: row.colorName,
            colorHex: row.colorHex,
            imageUrl: row.imageUrl,
        },
        typeCounts: {
            SET: row.setCount,
            BUNDLE: row.bundleCount,
        },
        qrCount: row.qrGeneratedCount,
        eligibleItemCount: row.eligibleItemCount,
        qrStatus: row.qrGeneratedCount >= row.eligibleItemCount ? "READY" : "PARTIAL",
    };
}

class QrCenterService {
    _stockItemRepository = stockItemRepository;
    _stockItemQrRepository = stockItemQrRepository;
    _stockInTransactionRepository = stockInTransactionRepository;
    _stockQrService = stockQrService;

    // QR Center listing: one row per Stock Registration (stock-in transaction) that produced
    // QR-eligible stock, not one row per QR — see stockInTransaction.repository.js's
    // findRegistrationsWithQr for the grouping/eligibility rule.
    async listRegistrations({ page, limit, keyword }) {
        const offset = (page - 1) * limit;

        const [rows, total] = await Promise.all([
            this._stockInTransactionRepository.findRegistrationsWithQr(db, { limit, offset, keyword }),
            this._stockInTransactionRepository.countRegistrationsWithQr(db, { keyword }),
        ]);

        return {
            data: rows.map(toRegistrationView),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    // QR Grid page: the Stock Registration's own identity plus every QR generated under it.
    // Read-only — never generates a QR, only ever reads what registerStockIn already
    // persisted (see stockIn.service.js).
    async getRegistrationDetail(stockInTransactionId) {
        const registration = await this._stockInTransactionRepository.findByIdWithContext(db, stockInTransactionId);
        if (!registration) {
            throw new ApiError(`Stock registration ${stockInTransactionId} not found.`, 404, "STOCK_REGISTRATION_NOT_FOUND");
        }

        const qrRows = await this._stockItemQrRepository.findByStockInTransactionId(db, stockInTransactionId);
        const latestQrRowsByStockItemId = latestQrByStockItemId(qrRows);

        const qrs = [...latestQrRowsByStockItemId.values()]
            .map((row) => ({
                stockItemId: row.stockItemId,
                type: row.type,
                payload: row.payload,
                generatedAt: row.generatedAt,
            }))
            .sort((a, b) => a.stockItemId - b.stockItemId);

        return {
            registration: {
                stockInTransactionId: registration.stockInTransactionId,
                stockDate: registration.stockDate,
                createdAt: registration.createdAt,
                design: {
                    id: registration.designId,
                    code: registration.designCode,
                    name: registration.designName,
                },
                variant: {
                    id: registration.colorVariantId,
                    colorName: registration.colorName,
                    colorHex: registration.colorHex,
                    imageUrl: registration.imageUrl,
                },
                totalQrCount: qrs.length,
            },
            qrs,
        };
    }

    // Idempotent by design: a stock item that already has a QR is reported back as
    // ALREADY_EXISTS with its existing QR rather than generating a duplicate history row
    // (stock_item_qr has no unique constraint on stock_item_id, so nothing at the DB layer
    // would stop that — see stockItemQr.schema.js). An id that isn't QR-eligible (wrong
    // type, CONSUMED, or unknown) is reported back as skipped instead of failing the batch.
    async generateForStockItemIds(stockItemIds) {
        return db.transaction(async (tx) => {
            const uniqueIds = [...new Set(stockItemIds)];

            const eligibleItems = await this._stockItemRepository.findEligibleByIds(tx, uniqueIds);
            const eligibleIds = new Set(eligibleItems.map((item) => item.stockItemId));
            const skipped = uniqueIds
                .filter((id) => !eligibleIds.has(id))
                .map((stockItemId) => ({ stockItemId, reason: "NOT_ELIGIBLE_OR_NOT_FOUND" }));

            const existingQrRows = await this._stockItemQrRepository.findByStockItemIds(tx, [...eligibleIds]);
            const latestQrById = latestQrByStockItemId(existingQrRows);

            const needsGeneration = eligibleItems.filter((item) => !latestQrById.has(item.stockItemId));

            // generateForStockItems bakes one shared {designCode, designName, colorName} into
            // every row it creates (see stockQr.service.js) — correct only within a single
            // color variant, so a mixed-variant selection is grouped before calling it.
            const groupsByVariant = new Map();
            for (const item of needsGeneration) {
                if (!groupsByVariant.has(item.colorVariantId)) groupsByVariant.set(item.colorVariantId, []);
                groupsByVariant.get(item.colorVariantId).push(item);
            }

            const generatedById = new Map();
            for (const groupItems of groupsByVariant.values()) {
                const { designCode, designName, colorName } = groupItems[0];
                const created = await this._stockQrService.generateForStockItems(
                    tx,
                    groupItems.map((item) => ({ id: item.stockItemId, type: item.type })),
                    { designCode, designName, colorName }
                );
                for (const row of created) generatedById.set(row.stockItemId, row);
            }

            const results = eligibleItems.map((item) => {
                const existing = latestQrById.get(item.stockItemId);
                const qrRow = existing ?? generatedById.get(item.stockItemId);

                return {
                    stockItemId: item.stockItemId,
                    status: existing ? "ALREADY_EXISTS" : "GENERATED",
                    qr: toQrView(qrRow),
                };
            });

            return {
                results,
                generatedCount: needsGeneration.length,
                alreadyExistedCount: eligibleItems.length - needsGeneration.length,
                skipped,
            };
        });
    }
}

export default new QrCenterService();
