const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const {
  createOrder, listOrders, getOrder, updateOrder,
  setPriority, dispatchOrder, markDelivered, cancelOrder, reassignOrder,
} = require('../controllers/orderController');

router.use(protect);
router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.patch('/:id', updateOrder);
router.patch('/:id/priority', allow('admin', 'dispatch'), setPriority);
router.post('/:id/dispatch', dispatchOrder);
router.patch('/:id/deliver', markDelivered);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reassign', allow('admin'), reassignOrder);

module.exports = router;
