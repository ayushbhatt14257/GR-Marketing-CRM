const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { listTasks, createTask, completeTask } = require('../controllers/taskController');

router.use(protect);
router.get('/', listTasks);
router.post('/', allow('admin'), createTask);
router.patch('/:id/complete', completeTask);

module.exports = router;
