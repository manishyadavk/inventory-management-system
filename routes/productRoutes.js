const express = require('express');
const controller = require('../controllers/productController');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Runs automatically for every route containing :id and rejects malformed ObjectIds with 400.
router.param('id', (req, res, next, id) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError(`Invalid product ID: ${id}`, 400));
  }
  next();
});

router.post('/', controller.createProduct);
router.get('/', controller.getProducts);

// Fixed paths must be declared BEFORE '/:id', otherwise "summary" would be treated as an ID.
router.get('/low-stock', controller.getLowStockProducts);
router.get('/summary', controller.getCategorySummary);

router.get('/:id', controller.getProductById);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);
router.patch('/:id/stock', controller.adjustStock);

module.exports = router;
