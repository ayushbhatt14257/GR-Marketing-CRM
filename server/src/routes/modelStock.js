const router = require('express').Router();
const multer = require('multer');
const { protect, allow } = require('../middleware/auth');
const {
  listModels, createModel, updateModel, deleteModel, previewUpload, commitUpload, exportModels,
} = require('../controllers/modelStockController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, allow('admin', 'warehouse'));
router.get('/', listModels);
router.get('/export', exportModels);
router.post('/', createModel);
router.patch('/:id', updateModel);
router.delete('/:id', deleteModel);
router.post('/upload/preview', upload.single('file'), previewUpload);
router.post('/upload/commit', commitUpload);

module.exports = router;
