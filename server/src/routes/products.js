const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { listProducts, createProduct, updateProduct, stockIn, getLedger, deleteProduct } = require('../controllers/productController');

router.use(protect);
router.get('/', listProducts);
router.post('/', allow('admin', 'warehouse'), createProduct);
router.patch('/:id', allow('admin', 'warehouse'), updateProduct);
router.post('/:id/stock-in', allow('admin', 'warehouse'), stockIn);
router.get('/:id/ledger', allow('admin', 'warehouse'), getLedger);
router.delete('/:id', allow('admin'), deleteProduct);

module.exports = router;
