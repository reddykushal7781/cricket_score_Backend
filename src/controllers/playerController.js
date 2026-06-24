const Player = require('../models/Player');

// @desc    Search roster players
// @route   GET /api/players/search
// @access  Private
const searchPlayers = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(200).json([]);
    }

    // Search players matching query (case-insensitive) in name or username
    const players = await Player.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    }).limit(10);

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
