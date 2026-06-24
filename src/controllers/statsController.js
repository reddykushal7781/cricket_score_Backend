const Match = require('../models/Match');

// Helper to convert balls to overs notation (e.g. 15 balls -> 2.3 overs)
const ballsToOvers = (balls) => {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return parseFloat(`${overs}.${remainingBalls}`);
};

// @desc    Get Stats Dashboard / Match Days
// @route   GET /api/stats/days
// @access  Private
const getMatchDays = async (req, res) => {
  try {
    const days = await Match.aggregate([
      {
        $group: {
          _id: '$date',
          matchesPlayed: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          matchesPlayed: 1,
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    res.status(200).json(days);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving match days' });
  }
};

// @desc    Get Top Performers of the Day
// @route   GET /api/stats/performers
// @access  Private
const getDayPerformers = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Please provide a date parameter' });
    }

    // Query matches played on this date
    const matches = await Match.find({ date });

    const batsmenMap = {};
    const bowlersMap = {};
    const dotBowlersMap = {};

    matches.forEach((match) => {
      // 1. Process innings scorecards
      if (match.innings) {
        match.innings.forEach((inn) => {
          // Batsmen
          if (inn.battingScorecard) {
            inn.battingScorecard.forEach((bat) => {
              const name = bat.name.trim();
              if (!batsmenMap[name]) {
                batsmenMap[name] = { name, runs: 0, balls: 0 };
              }
              batsmenMap[name].runs += bat.runs || 0;
              batsmenMap[name].balls += bat.ballsFaced || 0;
            });
          }

          // Bowlers
          if (inn.bowlingScorecard) {
            inn.bowlingScorecard.forEach((bowl) => {
              const name = bowl.name.trim();
              if (!bowlersMap[name]) {
                bowlersMap[name] = { name, wickets: 0, runsConceded: 0, balls: 0 };
              }
              bowlersMap[name].wickets += bowl.wickets || 0;
              bowlersMap[name].runsConceded += bowl.runsConceded || 0;
              bowlersMap[name].balls += bowl.ballsBowled || 0;
            });
          }
        });
      }

      // 2. Process ball events for dot ball count
      if (match.ballEvents) {
        match.ballEvents.forEach((evt) => {
          const bowler = evt.bowlerName.trim();
          if (!dotBowlersMap[bowler]) {
            dotBowlersMap[bowler] = { name: bowler, dotBalls: 0, balls: 0 };
          }
          dotBowlersMap[bowler].balls += 1;
          // Dot ball criteria: 0 runs off bat and 0 extra runs
          if (evt.runs === 0 && evt.extraRuns === 0) {
            dotBowlersMap[bowler].dotBalls += 1;
          }
        });
      }
    });

    // Format and sort top batsmen (by runs desc, then strike rate desc)
    const topBatsmen = Object.values(batsmenMap)
      .map((b) => {
        const strikeRate = b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(2)) : 0.0;
        return {
          name: b.name,
          runs: b.runs,
          balls: b.balls,
          strikeRate,
        };
      })
      .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
      .slice(0, 10);

    // Format and sort top bowlers (by wickets desc, then runs conceded asc)
    const topBowlers = Object.values(bowlersMap)
      .map((b) => ({
        name: b.name,
        wickets: b.wickets,
        runsConceded: b.runsConceded,
        overs: ballsToOvers(b.balls),
      }))
      .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
      .slice(0, 10);

    // Format and sort top dot bowlers (by dot balls desc)
    const topDotBowlers = Object.values(dotBowlersMap)
      .map((b) => ({
        name: b.name,
        dotBalls: b.dotBalls,
        overs: ballsToOvers(b.balls),
      }))
      .sort((a, b) => b.dotBalls - a.dotBalls)
      .slice(0, 10);

    res.status(200).json({
      date,
      topBatsmen,
      topBowlers,
      topDotBowlers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving day stats' });
  }
};

module.exports = {
  getMatchDays,
  getDayPerformers,
};
