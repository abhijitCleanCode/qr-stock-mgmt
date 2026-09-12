import { parseBundleCompositionSignature } from "./stockInPersistence.service.js";

class StockOutCalculator {
    // Mirrors stockInCalculator's shape, but every quantity here represents pieces *sold*
    // (removed), not received — the caller negates this delta before applying it to
    // variant_inventory.
    calculateStockOut(activeSizes, input, bundleGroups) {
        const delta = new Map(activeSizes.map((size) => [size.id, 0]));

        this._addCompleteSets(delta, activeSizes, input.totalSetsSold ?? 0);
        this._addBundles(delta, input.bundles ?? [], bundleGroups);
        this._addLoosePieces(delta, input.loosePieces ?? []);

        return delta;
    }

    _addCompleteSets(delta, activeSizes, quantity) {
        if (quantity <= 0) return;

        for (const size of activeSizes) {
            if (!size.includedInSet) continue;

            delta.set(size.id, delta.get(size.id) + quantity);
        }
    }

    // bundleGroups is positionally aligned with input's bundles array (see
    // stockOutValidator._validateBundleGroups) — each group's compositionSignature is the
    // source of truth for what one unit of that bundle actually contains.
    _addBundles(delta, bundles, bundleGroups) {
        bundles.forEach((bundle, index) => {
            const composition = parseBundleCompositionSignature(bundleGroups[index].compositionSignature);

            for (const piece of composition) {
                const quantity = piece.quantity * bundle.quantity;
                delta.set(piece.designSizeId, delta.get(piece.designSizeId) + quantity);
            }
        });
    }

    _addLoosePieces(delta, loosePieces) {
        for (const piece of loosePieces) {
            delta.set(piece.designSizeId, delta.get(piece.designSizeId) + piece.quantity);
        }
    }
}

export default new StockOutCalculator();
