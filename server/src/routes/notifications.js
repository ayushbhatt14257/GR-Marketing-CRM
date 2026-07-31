const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { listNotifications, markRead, clearOne, clearAll } = require('../controllers/notificationController');

router.use(protect);
router.get('/', listNotifications);
router.patch('/:id/read', markRead);
router.delete('/:id', clearOne);
router.delete('/', clearAll);

module.exports = router;
