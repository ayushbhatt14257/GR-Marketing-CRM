const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const {
  marketingDashboard, warehouseDashboard, dispatchDashboard, adminDashboard, heatmap, analytics, attendance,
} = require('../controllers/dashboardController');

router.use(protect);
router.get('/marketing', marketingDashboard);
router.get('/warehouse', warehouseDashboard);
router.get('/dispatch', dispatchDashboard);
router.get('/admin', adminDashboard);
router.get('/heatmap', heatmap);
router.get('/analytics', allow('admin'), analytics);
router.get('/attendance', allow('admin'), attendance);

module.exports = router;
