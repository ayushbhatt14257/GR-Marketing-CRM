const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { searchCustomers, resolveCustomer, listCustomers, deleteCustomer } = require('../controllers/customerController');

router.use(protect);
router.get('/search', searchCustomers);
router.get('/', listCustomers);
router.post('/resolve', resolveCustomer);
router.delete('/:id', allow('admin'), deleteCustomer);

module.exports = router;
