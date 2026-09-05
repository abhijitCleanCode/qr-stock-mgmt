// merges all modules routes
import { Router } from 'express';
import { buildRouter } from './routeBuilder.js';

// modules routes
import { designRoutes } from '../../modules/design/routes/design.route.js';
import { stockInRoutes } from '../../modules/stock/routes/stockIn.route.js';
import { stockItemRoutes } from '../../modules/stock/routes/stockItem.route.js';
import { qrCenterRoutes } from '../../modules/stock/routes/qrCenter.route.js';
import { stockHistoryRoutes } from '../../modules/stock/routes/stockHistory.route.js';
import { currentStockRoutes } from '../../modules/inventory/routes/currentStock.route.js';

const router = Router();

router.use('/designs', buildRouter(designRoutes));
router.use('/stock-in', buildRouter(stockInRoutes));
router.use('/stock-items', buildRouter(stockItemRoutes));
router.use('/qr-center', buildRouter(qrCenterRoutes));
router.use('/stock-history', buildRouter(stockHistoryRoutes));
router.use('/current-stock', buildRouter(currentStockRoutes));

export default router;
