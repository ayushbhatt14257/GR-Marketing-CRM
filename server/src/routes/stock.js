const router = require('express').Router();
const multer = require('multer');
const { protect, allow } = require('../middleware/auth');
const { previewUpload, commitUpload } = require('../controllers/stockUploadController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, allow('admin', 'warehouse'));
router.post('/upload/preview', upload.single('file'), previewUpload);
router.post('/upload/commit', commitUpload);

module.exports = router;
