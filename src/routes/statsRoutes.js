const express = require('express');
const { getMatchDays, getDayPerformers } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/days', protect, getMatchDays);
router.get('/performers', protect, getDayPerformers);

module.exports = router;
