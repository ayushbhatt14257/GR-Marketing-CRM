const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { searchCustomers, resolveCustomer, listCustomers } = require('../controllers/customerController');

router.use(protect);
router.get('/search', searchCustomers);
router.get('/', listCustomers);
router.post('/resolve', resolveCustomer);

module.exports = router;
