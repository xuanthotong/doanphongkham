const express = require('express');
const router = express.Router();
const { getStats, getRevenue } = require('../controllers/dashboardController');

router.get('/stats', getStats);
router.get('/revenue', getRevenue);

module.exports = router;