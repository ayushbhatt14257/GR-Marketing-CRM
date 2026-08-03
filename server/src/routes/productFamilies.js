const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { listFamilies, createFamily, updateFamily, deleteFamily } = require('../controllers/productFamilyController');

router.use(protect);
router.get('/', listFamilies);
router.post('/', allow('admin', 'warehouse'), createFamily);
router.patch('/:id', allow('admin', 'warehouse'), updateFamily);
router.delete('/:id', allow('admin'), deleteFamily);

module.exports = router;
