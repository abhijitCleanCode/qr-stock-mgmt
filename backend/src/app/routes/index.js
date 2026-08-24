// merges all modules routes
import { Router } from 'express';
import { buildRouter } from './routeBuilder.js';

// modules routes
import { designRoutes } from '../../modules/design/routes/design.route.js';
import { stockInRoutes } from '../../modules/stock/routes/stockIn.route.js';
import { stockItemRoutes } from '../../modules/stock/routes/stockItem.route.js';

const router = Router();

router.use('/designs', buildRouter(designRoutes));
router.use('/stock-in', buildRouter(stockInRoutes));
router.use('/stock-items', buildRouter(stockItemRoutes));

export default router;
