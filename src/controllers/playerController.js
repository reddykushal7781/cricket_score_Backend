const Player = require('../models/Player');
const Group = require('../models/Group');
const Match = require('../models/Match');

// @desc    Search roster players
// @route   GET /api/players/search
// @access  Private
const searchPlayers = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(200).json([]);
    }

    const groupName = req.query.groupName || req.query.group || req.headers['x-group-name'] || req.headers['group-name'];

    let allowedUsernames = [];
    let allowedNames = [];
    let groupFound = false;

    if (groupName) {
      const group = await Group.findOne({ name: { $regex: `^${groupName}$`, $options: 'i' } });
      if (group) {
        groupFound = true;
        allowedUsernames = group.members || [];
        
        // Find match player names for matches in this group
        const matches = await Match.find({ groupName: group.name });
        const matchPlayerNames = new Set();
        matches.forEach(match => {
          if (match.innings) {
            match.innings.forEach(inn => {
              if (inn.battingScorecard) {
                inn.battingScorecard.forEach(bat => {
                  if (bat.name) matchPlayerNames.add(bat.name);
                });
              }
              if (inn.bowlingScorecard) {
                inn.bowlingScorecard.forEach(bowl => {
                  if (bowl.name) matchPlayerNames.add(bowl.name);
                });
              }
            });
          }
        });
        allowedNames = Array.from(matchPlayerNames);
      }
    } else {
      // Fallback: get all groups of the logged-in user
      const userGroups = await Group.find({ members: req.user.username });
      if (userGroups.length > 0) {
        groupFound = true;
        const allGroupMembers = new Set();
        userGroups.forEach(g => {
          if (g.members) {
            g.members.forEach(m => allGroupMembers.add(m));
          }
        });
        allowedUsernames = Array.from(allGroupMembers);

        // Find match player names for matches in all these groups
        const groupNamesList = userGroups.map(g => g.name);
        const matches = await Match.find({ groupName: { $in: groupNamesList } });
        const matchPlayerNames = new Set();
        matches.forEach(match => {
          if (match.innings) {
            match.innings.forEach(inn => {
              if (inn.battingScorecard) {
                inn.battingScorecard.forEach(bat => {
                  if (bat.name) matchPlayerNames.add(bat.name);
                });
              }
              if (inn.bowlingScorecard) {
                inn.bowlingScorecard.forEach(bowl => {
                  if (bowl.name) matchPlayerNames.add(bowl.name);
                });
              }
            });
          }
        });
        allowedNames = Array.from(matchPlayerNames);
      }
    }

    let searchFilter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    };

    if (groupFound) {
      searchFilter = {
        $and: [
          searchFilter,
          {
            $or: [
              { username: { $in: allowedUsernames } },
              { name: { $in: allowedUsernames } },
              { name: { $in: allowedNames } },
            ],
          },
        ],
      };
    } else if (groupName) {
      // If groupName was provided but group not found, return empty array
      return res.status(200).json([]);
    } else {
      // If no group found and no groupName provided, restrict search to the user themselves
      searchFilter = {
        $and: [
          searchFilter,
          {
            $or: [
              { username: req.user.username },
              { name: req.user.username },
            ],
          },
        ],
      };
    }

    const players = await Player.find(searchFilter).limit(10);

    const formattedPlayers = players.map(player => ({
      id: parseInt(player._id.toString().substring(18, 24), 16),
      name: player.name,
    }));

    res.status(200).json(formattedPlayers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during player search' });
  }
};

// @desc    Get player profile stats
// @route   GET /api/players/:name/profile
// @access  Private
const getPlayerProfile = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);

    const player = await Player.findOne({
      $or: [
        { name },
        { username: name },
      ],
    });
    if (!player) {
      return res.status(404).json({ success: false, message: `Player '${name}' not found` });
    }

    // Map database Player document to the UserProfile model structure expected by the Flutter frontend
    const profile = {
      username: player.username || player.name,
      name: player.name,
      avatarUrl: player.avatarUrl,
      role: player.role,
      battingStyle: player.battingStyle,
      bowlingStyle: player.bowlingStyle,
      stats: player.stats,
    };

    res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving player profile' });
  }
};

module.exports = {
  searchPlayers,
  getPlayerProfile,
};
