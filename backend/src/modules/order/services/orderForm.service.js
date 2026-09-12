import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import orderFormRepository from "../repositories/orderForm.repository.js";
import orderFormItemRepository from "../repositories/orderFormItem.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";
import orderFormMapper from "../mapper/orderFormMapper.js";
import orderFormPhotoSyncService from "./orderFormPhotoSync.service.js";

function todayAsIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

// A LOOSE_PIECE item's quantity is always the sum of its own breakdown — never trusted as a
// separate client-supplied number, so the two can never drift apart.
function sumBreakdown(breakdown) {
    return Object.values(breakdown).reduce((sum, quantity) => sum + quantity, 0);
}

function buildItemRow(orderFormId, item) {
    if (item.type === "SET") {
        return {
            orderFormId,
            colorVariantId: item.colorVariantId,
            type: "SET",
            quantity: item.quantity,
            loosePiecesBreakdown: null,
            unitPrice: item.unitPrice,
            estimatedValue: item.quantity * item.unitPrice,
        };
    }

    const quantity = sumBreakdown(item.loosePiecesBreakdown);
    return {
        orderFormId,
        colorVariantId: item.colorVariantId,
        type: "LOOSE_PIECE",
        quantity,
        loosePiecesBreakdown: item.loosePiecesBreakdown,
        unitPrice: item.unitPrice,
        estimatedValue: quantity * item.unitPrice,
    };
}

function groupItemsByOrderFormId(items) {
    const map = new Map();
    for (const item of items) {
        const list = map.get(item.orderFormId) ?? [];
        list.push(item);
        map.set(item.orderFormId, list);
    }
    return map;
}

class OrderFormService {
    _orderFormRepository = orderFormRepository;
    _orderFormItemRepository = orderFormItemRepository;
    _designSizeRepository = designSizeRepository;
    _orderFormMapper = orderFormMapper;
    _orderFormPhotoSyncService = orderFormPhotoSyncService;

    // Every item's size-by-size quantity breakdown (see orderFormMapper.buildSizeBreakdown)
    // needs that variant's active sizes — fetched once per distinct colorVariantId rather
    // than once per item, since a variant commonly appears in both a SET and a LOOSE_PIECE row.
    async _buildSizesByVariantId(runner, items) {
        const variantIds = [...new Set(items.map((item) => item.colorVariantId))];
        const sizes = await this._designSizeRepository.findActiveByVariantIds(runner, variantIds);

        const map = new Map();
        for (const size of sizes) {
            const list = map.get(size.variantId) ?? [];
            list.push(size);
            map.set(size.variantId, list);
        }
        return map;
    }

    async createOrderForm(data) {
        return db.transaction(async (tx) => {
            const { items, ...header } = data;

            const created = await this._orderFormRepository.create(tx, {
                retailerName: header.retailerName,
                contactPerson: header.contactPerson ?? null,
                location: header.location ?? null,
                orderDate: header.orderDate ?? todayAsIsoDate(),
                notes: header.notes ?? null,
            });

            const rows = items.map((item) => buildItemRow(created.id, item));
            await this._orderFormItemRepository.createMany(tx, rows);
            await this._orderFormPhotoSyncService.syncDesignPhotos(tx, created.id, rows.map((row) => row.colorVariantId));

            const savedItems = await this._orderFormItemRepository.findByOrderFormId(tx, created.id);
            const sizesByVariantId = await this._buildSizesByVariantId(tx, savedItems);
            return this._orderFormMapper.mapDetail(created, savedItems, sizesByVariantId);
        });
    }

    async updateOrderForm(id, data) {
        return db.transaction(async (tx) => {
            const existing = await this._orderFormRepository.findById(tx, id);
            if (!existing) {
                throw new ApiError(`Order form ${id} not found.`, 404, "ORDER_FORM_NOT_FOUND");
            }

            const { items, ...header } = data;

            const updated = await this._orderFormRepository.update(tx, id, {
                retailerName: header.retailerName,
                contactPerson: header.contactPerson ?? null,
                location: header.location ?? null,
                orderDate: header.orderDate ?? existing.orderDate,
                notes: header.notes ?? null,
            });

            // Replace-all is simplest and safe here — an order form never drives real stock
            // movement, so there's no lineage/consumption to preserve across an edit, unlike
            // Stock In/Out's items.
            await this._orderFormItemRepository.deleteByOrderFormId(tx, id);
            const rows = items.map((item) => buildItemRow(id, item));
            await this._orderFormItemRepository.createMany(tx, rows);
            await this._orderFormPhotoSyncService.syncDesignPhotos(tx, id, rows.map((row) => row.colorVariantId));

            const savedItems = await this._orderFormItemRepository.findByOrderFormId(tx, id);
            const sizesByVariantId = await this._buildSizesByVariantId(tx, savedItems);
            return this._orderFormMapper.mapDetail(updated, savedItems, sizesByVariantId);
        });
    }

    async updateStatus(id, status) {
        const updated = await this._orderFormRepository.updateStatus(db, id, status);
        if (!updated) {
            throw new ApiError(`Order form ${id} not found.`, 404, "ORDER_FORM_NOT_FOUND");
        }

        const items = await this._orderFormItemRepository.findByOrderFormId(db, id);
        const sizesByVariantId = await this._buildSizesByVariantId(db, items);
        return this._orderFormMapper.mapDetail(updated, items, sizesByVariantId);
    }

    async getOrderFormDetail(id) {
        const orderForm = await this._orderFormRepository.findById(db, id);
        if (!orderForm) {
            throw new ApiError(`Order form ${id} not found.`, 404, "ORDER_FORM_NOT_FOUND");
        }

        const items = await this._orderFormItemRepository.findByOrderFormId(db, id);
        const sizesByVariantId = await this._buildSizesByVariantId(db, items);
        return this._orderFormMapper.mapDetail(orderForm, items, sizesByVariantId);
    }

    async listOrderForms({ page, limit, status, keyword }) {
        const offset = (page - 1) * limit;

        const [orderForms, total, statusCounts] = await Promise.all([
            this._orderFormRepository.findMany(db, { limit, offset, status, keyword }),
            this._orderFormRepository.count(db, { status, keyword }),
            this._orderFormRepository.countByStatus(db),
        ]);

        const items = await this._orderFormItemRepository.findByOrderFormIds(db, orderForms.map((form) => form.id));
        const itemsByOrderFormId = groupItemsByOrderFormId(items);

        const tabCounts = { DRAFT: 0, SHARED: 0, CONVERTED: 0, CANCELLED: 0 };
        for (const row of statusCounts) tabCounts[row.status] = row.value;

        return {
            data: orderForms.map((form) => this._orderFormMapper.mapListItem(form, itemsByOrderFormId.get(form.id) ?? [])),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                statusCounts: tabCounts,
            },
        };
    }
}

export default new OrderFormService();
