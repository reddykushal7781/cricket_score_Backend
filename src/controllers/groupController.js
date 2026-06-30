const Group = require('../models/Group');

// @desc    Create a new group
// @route   POST /api/groups/create
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { groupName } = req.body;
    const username = req.user.username;

    if (!groupName) {
      return res.status(400).json({ success: false, message: 'Please provide groupName' });
    }

    // Check if group already exists
    const groupExists = await Group.findOne({ name: groupName });
    if (groupExists) {
      return res.status(400).json({ success: false, message: `Group '${groupName}' already exists` });
    }

    // Create group and add creator to members
    const group = await Group.create({
      name: groupName,
      createdBy: username,
      members: [username],
    });

    res.status(201).json({
      success: true,
      message: `Group '${groupName}' created successfully.`,
      groupId: group._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during group creation' });
  }
};

// @desc    Join an existing group
// @route   POST /api/groups/join
// @access  Private
const joinGroup = async (req, res) => {
  try {
    const { groupName } = req.body;
    const username = req.user.username;

    if (!groupName) {
      return res.status(400).json({ success: false, message: 'Please provide groupName' });
    }

    // Find group by name
    const group = await Group.findOne({ name: groupName });
    if (!group) {
      return res.status(404).json({ success: false, message: `Group '${groupName}' not found` });
    }

    // Add user to members if not already joined
    if (!group.members.includes(username)) {
      group.members.push(username);
      await group.save();
    }

    res.status(200).json({
      success: true,
      message: `Successfully joined group '${groupName}'.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during group join' });
  }
};

// @desc    Get user's registered groups
// @route   GET /api/groups/my-groups
// @access  Private
const getMyGroups = async (req, res) => {
  try {
    const username = req.user.username;

    // Find groups where member list contains username
    const groups = await Group.find({ members: username });
    const groupNames = groups.map((g) => g.name);

    res.status(200).json({
      success: true,
      groups: groupNames,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving groups' });
  }
};

// Helper function to verify if a user belongs to a group
const verifyGroupMembership = async (username, groupName) => {
  if (!groupName) return { allowed: true };
  const group = await Group.findOne({ name: groupName });
  if (!group) {
    return { allowed: false, status: 404, message: `Group '${groupName}' not found` };
  }
  if (!group.members.includes(username)) {
    return { allowed: false, status: 403, message: `You are not a member of group '${groupName}'` };
  }
  return { allowed: true };
};

// @desc    Search groups by name prefix
// @route   GET /api/groups/search
// @access  Private
const searchGroups = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(200).json([]);
    }

    // Escape special regex characters to prevent query injections
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Case-insensitive prefix search, limit to 3 matches
    const groups = await Group.find({
      name: { $regex: `^${escapedQuery}`, $options: 'i' }
    }).limit(3);

    const formattedGroups = groups.map((g) => ({
      id: g._id,
      name: g.name,
    }));

    res.status(200).json(formattedGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during group search' });
  }
};

module.exports = {
  createGroup,
  joinGroup,
  getMyGroups,
  searchGroups,
  verifyGroupMembership,
};
