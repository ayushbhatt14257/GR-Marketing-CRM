const router = require('express').Router();
const multer = require('multer');
const { protect, allow } = require('../middleware/auth');
const {
  listModels, createModel, updateModel, deleteModel, previewUpload, commitUpload, exportModels,
} = require('../controllers/modelStockController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

// Viewing/exporting is open to every role — category access is enforced
// per-user inside the controller (marketing/dispatch users locked to one
// category only ever see that category's data).
router.get('/', listModels);
router.get('/export', exportModels);

// Editing stays admin/warehouse only.
router.post('/', allow('admin', 'warehouse'), createModel);
router.patch('/:id', allow('admin', 'warehouse'), updateModel);
router.delete('/:id', allow('admin', 'warehouse'), deleteModel);
router.post('/upload/preview', allow('admin', 'warehouse'), upload.single('file'), previewUpload);
router.post('/upload/commit', allow('admin', 'warehouse'), commitUpload);

module.exports = router;
