const express = require('express');
const { publishMatch, getMatchDetails, undoMatch } = require('../controllers/matchController');
const { protect, authorizeUser } = require('../middleware/auth');
const router = express.Router();

router.post('/publish', protect, authorizeUser, publishMatch);
router.get('/:matchId', protect,authorizeUser, getMatchDetails);
router.delete('/:matchId', protect,authorizeUser, undoMatch);

module.exports = router;
