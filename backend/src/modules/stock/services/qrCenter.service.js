import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import stockItemRepository from "../repositories/stockItem.repository.js";
import stockItemQrRepository from "../repositories/stockItemQr.repository.js";
import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockHistoryRepository from "../repositories/stockHistory.repository.js";
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

// QR Center merges two kinds of stock event into one "registration" list — Stock In
// transactions and transformation (assembly) events — each fetched from its own table and
// capped rather than a cross-table SQL UNION, then merged/sorted/paginated here. This app's
// registration volume is small (a business's own inventory events, not a high-volume feed),
// so an in-memory merge is simpler and safer than getting set-operator column aliasing exactly
// right; if registration volume ever approaches this cap, replace this with a real UNION ALL
// query ordered/paginated at the database level.
const REGISTRATION_SAFETY_CAP = 1000;

// eligibleItemCount vs qrGeneratedCount only ever disagrees if QR generation was interrupted
// before this registration's stock-in transaction committed (impossible — see
// stockIn.service.js, which generates QRs in the same transaction as the stock items
// themselves) or a stock item is still mid-backfill via the manual /qr-center/generate path.
// Kept as a real comparison rather than hardcoded "READY" so that edge case still surfaces.
function toStockInRegistrationView(row) {
    return {
        registrationType: "STOCK_IN",
        registrationId: row.stockInTransactionId,
        createdAt: row.createdAt,
        displayDate: row.stockDate,
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

// A transformation's QR generation is never partial (see stockItem.service.js
// assembleSet/assembleBundle — generation happens in the same transaction as the event
// itself), so qrCount/eligibleItemCount are both just `quantity` and qrStatus is always READY.
function toTransformationRegistrationView(row) {
    const isSet = row.eventType === "SET_ASSEMBLED";

    return {
        registrationType: "TRANSFORMATION",
        registrationId: row.id,
        transformationType: row.eventType,
        createdAt: row.createdAt,
        displayDate: row.createdAt,
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
            SET: isSet ? row.quantity : 0,
            BUNDLE: isSet ? 0 : row.quantity,
        },
        qrCount: row.quantity,
        eligibleItemCount: row.quantity,
        qrStatus: "READY",
    };
}

// Every stock_history assembly event stores which stock items it created — as a plural array
// for a bulk transformation (see stockItem.service.js's generalized assembleSet), or as the
// legacy singular field for a single-unit event (assembleBundle, or an assembleSet call made
// before that generalization). Always resolve through here rather than reading either field
// directly, so both shapes keep working.
function resultStockItemIdsFromMetadata(event) {
    const metadata = event.metadata ?? {};
    if (Array.isArray(metadata.resultStockItemIds)) return metadata.resultStockItemIds;
    if (metadata.resultStockItemId) return [metadata.resultStockItemId];
    return [];
}

class QrCenterService {
    _stockItemRepository = stockItemRepository;
    _stockItemQrRepository = stockItemQrRepository;
    _stockInTransactionRepository = stockInTransactionRepository;
    _stockHistoryRepository = stockHistoryRepository;
    _stockQrService = stockQrService;

    // QR Center listing: one row per stock EVENT that produced QR-eligible stock — a Stock In
    // transaction, or a loose-to-set/bundle transformation — not one row per QR. Each source is
    // queried independently (see stockInTransaction.repository.js's findRegistrationsWithQr and
    // stockHistory.repository.js's findAssemblyRegistrations) and merged/sorted/paginated here;
    // see REGISTRATION_SAFETY_CAP above for why this isn't a single cross-table SQL query.
    async listRegistrations({ page, limit, keyword }) {
        const [stockInRows, transformationRows, stockInTotal, transformationTotal] = await Promise.all([
            this._stockInTransactionRepository.findRegistrationsWithQr(db, { limit: REGISTRATION_SAFETY_CAP, offset: 0, keyword }),
            this._stockHistoryRepository.findAssemblyRegistrations(db, { limit: REGISTRATION_SAFETY_CAP, keyword }),
            this._stockInTransactionRepository.countRegistrationsWithQr(db, { keyword }),
            this._stockHistoryRepository.countAssemblyRegistrations(db, { keyword }),
        ]);

        const merged = [
            ...stockInRows.map(toStockInRegistrationView),
            ...transformationRows.map(toTransformationRegistrationView),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = stockInTotal + transformationTotal;
        const offset = (page - 1) * limit;

        return {
            data: merged.slice(offset, offset + limit),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    // QR Grid page: one registration's identity plus every QR generated under it. Read-only —
    // never generates a QR, only ever reads what registerStockIn/assembleSet/assembleBundle
    // already persisted. Dispatches on registrationType rather than being two separate methods
    // (getRegistrationDetail vs a hypothetical getTransformationDetail) so QR Center has exactly
    // one "load a registration's detail" entry point, same as it has exactly one listing method.
    async getRegistrationDetail({ registrationType, registrationId }) {
        if (registrationType === "TRANSFORMATION") {
            return this._getTransformationRegistrationDetail(registrationId);
        }
        return this._getStockInRegistrationDetail(registrationId);
    }

    async _getStockInRegistrationDetail(stockInTransactionId) {
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
                registrationType: "STOCK_IN",
                registrationId: registration.stockInTransactionId,
                stockInTransactionId: registration.stockInTransactionId,
                stockDate: registration.stockDate,
                challanNo: registration.challanNo,
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

    // Transformation Event → created SET/BUNDLE stock items → their QRs. The event's own
    // metadata already names every stock item it created (resultStockItemIdsFromMetadata) and
    // every loose piece it consumed (metadata.sourceStockItemIds) — no join back through
    // stock_item_lineage is needed just to answer "what does this registration contain".
    async _getTransformationRegistrationDetail(transformationId) {
        const event = await this._stockHistoryRepository.findByIdWithContext(db, transformationId);
        if (!event) {
            throw new ApiError(`Stock transformation ${transformationId} not found.`, 404, "STOCK_TRANSFORMATION_NOT_FOUND");
        }

        const resultStockItemIds = resultStockItemIdsFromMetadata(event);
        const itemType = event.eventType === "SET_ASSEMBLED" ? "SET" : "BUNDLE";

        const qrRows = await this._stockItemQrRepository.findByStockItemIds(db, resultStockItemIds);
        const latestQrRowsByStockItemId = latestQrByStockItemId(qrRows);

        const qrs = [...latestQrRowsByStockItemId.values()]
            .map((row) => ({
                stockItemId: row.stockItemId,
                type: itemType,
                payload: row.payload,
                generatedAt: row.generatedAt,
            }))
            .sort((a, b) => a.stockItemId - b.stockItemId);

        return {
            registration: {
                registrationType: "TRANSFORMATION",
                registrationId: event.id,
                transformationType: event.eventType,
                createdAt: event.createdAt,
                design: {
                    id: event.designId,
                    code: event.designCode,
                    name: event.designName,
                },
                variant: {
                    id: event.colorVariantId,
                    colorName: event.colorName,
                    colorHex: event.colorHex,
                    imageUrl: event.imageUrl,
                },
                unitsCreated: event.quantity,
                consumedStockItemIds: event.metadata?.sourceStockItemIds ?? [],
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
