const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { listAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');

router.use(protect);
router.get('/', listAnnouncements);
router.post('/', allow('admin'), createAnnouncement);
router.delete('/:id', allow('admin'), deleteAnnouncement);

module.exports = router;
