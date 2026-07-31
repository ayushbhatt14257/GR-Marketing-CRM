const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');
const { addPoints } = require('../services/pointsEngine');
const { notify } = require('../services/notificationService');

// GET /api/tasks
const listTasks = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.user.role !== 'admin') filter.assignedTo = req.user._id;
  else if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.status) filter.status = req.query.status;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name')
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json(tasks);
});

// POST /api/tasks  (admin only)
const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, dueDate, bonusPoints } = req.body;
  if (!title || !assignedTo) {
    res.status(400);
    throw new Error('Title and assignedTo are required');
  }

  const task = await Task.create({
    title: title.trim(),
    description: description || '',
    assignedTo,
    assignedBy: req.user._id,
    dueDate: dueDate || null,
    bonusPoints: bonusPoints || 0,
  });

  await notify(assignedTo, {
    title: 'New task assigned',
    message: `${req.user.name} assigned you: "${title}"`,
    type: 'task_assigned',
    refId: task._id,
  });

  res.status(201).json(task);
});

// PATCH /api/tasks/:id/complete  (assignee marks done -> awards bonus points)
const completeTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  if (String(task.assignedTo) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You cannot complete this task');
  }
  if (task.status === 'completed') {
    return res.json(task);
  }

  task.status = 'completed';
  task.completedAt = new Date();
  await task.save();

  if (task.bonusPoints > 0) {
    await addPoints(task.assignedTo, task.bonusPoints, 'task_completed', task._id, `Task: ${task.title}`);
  }

  res.json(task);
});

module.exports = { listTasks, createTask, completeTask };
