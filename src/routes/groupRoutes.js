const express = require('express');
const { createGroup, joinGroup, getMyGroups, searchGroups } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/create', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/my-groups', protect, getMyGroups);
router.get('/search', protect, searchGroups);

module.exports = router;
