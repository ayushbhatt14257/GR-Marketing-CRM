const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const { createLead, listLeads, closeFollowUp, reassignLead } = require('../controllers/leadController');

router.use(protect);
router.post('/', createLead);
router.get('/', listLeads);
router.patch('/:id/close', closeFollowUp);
router.patch('/:id/reassign', allow('admin'), reassignLead);

module.exports = router;
