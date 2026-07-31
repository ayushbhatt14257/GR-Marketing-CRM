const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deleteUser, getUserDetail } = require('../controllers/userController');

router.use(protect);
router.get('/', listUsers);
router.get('/:id/detail', allow('admin'), getUserDetail);
router.post('/', allow('admin'), createUser);
router.patch('/:id', allow('admin'), updateUser);
router.delete('/:id', allow('admin'), deleteUser);

module.exports = router;
