const express = require('express');
const { publishMatch, getMatchDetails, undoMatch } = require('../controllers/matchController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/publish', protect, publishMatch);
router.get('/:matchId', protect, getMatchDetails);
router.delete('/:matchId', protect, undoMatch);

module.exports = router;
