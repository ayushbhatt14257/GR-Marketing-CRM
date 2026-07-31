const router = require('express').Router();
const multer = require('multer');
const { protect, allow } = require('../middleware/auth');
const { previewBookMatch } = require('../controllers/bookMatchController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, allow('admin'));
router.post('/preview', upload.single('file'), previewBookMatch);

module.exports = router;
