const express = require('express');
const { searchPlayers, getPlayerProfile } = require('../controllers/playerController');
const { getPlayerMatches } = require('../controllers/matchController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/search', protect, searchPlayers);
router.get('/:name/profile', protect, getPlayerProfile);
router.get('/:name/matches', protect, getPlayerMatches);

module.exports = router;
