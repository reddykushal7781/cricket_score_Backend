const Match = require('../models/Match');
const Player = require('../models/Player');

// Helper to construct Cricbuzz-style dismissal summary text
const getDismissalSummary = (bat) => {
  if (!bat || !bat.isOut) return 'not out';

  const type = (bat.dismissalType || 'none').toLowerCase().trim();
  const bowler = bat.dismissedBy;
  const fielder = bat.fielderName;

  switch (type) {
    case 'bowled':
      return `b ${bowler}`;
    case 'caught':
      return fielder ? `c ${fielder} b ${bowler}` : `c & b ${bowler}`;
    case 'lbw':
      return `lbw b ${bowler}`;
    case 'stumped':
      return fielder ? `stumped ${fielder} b ${bowler}` : `stumped b ${bowler}`;
    case 'run out':
      return fielder ? `run out (${fielder})` : 'run out';
    case 'hit wicket':
      return `hit wicket b ${bowler}`;
    case 'retired hurt':
      return 'retired hurt';
    case 'retired out':
      return 'retired out';
    case 'hit the ball twice':
      return `hit the ball twice b ${bowler}`;
    case 'obstructing the field':
      return fielder ? `obstructing the field (${fielder})` : 'obstructing the field';
    case 'timed out':
      return 'timed out';
    default:
      return 'out';
  }
};

// @desc    Publish Match Results & Sync Stats
// @route   POST /api/matches/publish
// @access  Private
const publishMatch = async (req, res) => {
  try {
    const matchData = req.body;

    if (!matchData || !matchData.matchId || !matchData.date) {
      return res.status(400).json({ success: false, message: 'Invalid match data payload' });
    }

    // Sanitize/normalize payload to prevent MongoDB validation/casting errors
    if (matchData.innings && Array.isArray(matchData.innings)) {
      matchData.innings.forEach((inning) => {
        if (inning.battingScorecard && Array.isArray(inning.battingScorecard)) {
          inning.battingScorecard.forEach((bat) => {
            if (!bat.name && bat.playerName) {
              bat.name = bat.playerName;
            }
            if (bat.playerId === undefined || bat.playerId === null) {
              bat.playerId = 0;
            }
            if (!bat.dismissalType) {
              bat.dismissalType = 'none';
            }
            if (!bat.dismissedBy) {
              bat.dismissedBy = null;
            }
            if (!bat.fielderName) {
              bat.fielderName = null;
            }
          });
        }

        if (inning.bowlingScorecard && Array.isArray(inning.bowlingScorecard)) {
          inning.bowlingScorecard.forEach((bowl) => {
            if (!bowl.name && bowl.playerName) {
              bowl.name = bowl.playerName;
            }
            if (bowl.playerId === undefined || bowl.playerId === null) {
              bowl.playerId = 0;
            }
          });
        }
      });
    }

    if (matchData.ballEvents && Array.isArray(matchData.ballEvents)) {
      matchData.ballEvents.forEach((evt) => {
        if (typeof evt.isWicket === 'boolean') {
          evt.isWicket = evt.isWicket ? 1 : 0;
        }
        if (!evt.wicketType) {
          evt.wicketType = 'none';
        }
        if (!evt.extraType) {
          evt.extraType = 'none';
        }
        if (!evt.fielderName) {
          evt.fielderName = null;
        }
      });
    }

    // Save the match record
    const match = await Match.create(matchData);

    // Aggregate stats updates per player name to prevent race conditions
    const playerUpdates = {};

    const getOrInitPlayer = (name) => {
      const trimmedName = name.trim();
      if (!playerUpdates[trimmedName]) {
        playerUpdates[trimmedName] = {
          name: trimmedName,
          batting: null,
          bowling: null,
          fielding: { catches: 0, stumpings: 0, runOuts: 0 },
        };
      }
      return playerUpdates[trimmedName];
    };

    // 1. Process Batting and Bowling Scorecards from Innings
    if (matchData.innings && Array.isArray(matchData.innings)) {
      matchData.innings.forEach((inning) => {
        // Batting
        if (inning.battingScorecard && Array.isArray(inning.battingScorecard)) {
          inning.battingScorecard.forEach((bat) => {
            if (!bat.name) return;
            const p = getOrInitPlayer(bat.name);
            p.batting = {
              runs: bat.runs || 0,
              ballsFaced: bat.ballsFaced || 0,
              fours: bat.fours || 0,
              sixes: bat.sixes || 0,
              isOut: bat.isOut || false,
            };
          });
        }

        // Bowling
        if (inning.bowlingScorecard && Array.isArray(inning.bowlingScorecard)) {
          inning.bowlingScorecard.forEach((bowl) => {
            if (!bowl.name) return;
            const p = getOrInitPlayer(bowl.name);
            p.bowling = {
              ballsBowled: bowl.ballsBowled || 0,
              runsConceded: bowl.runsConceded || 0,
              wickets: bowl.wickets || 0,
            };
          });
        }
      });
    }

    // 2. Process Fielding Stats from Ball Events
    if (matchData.ballEvents && Array.isArray(matchData.ballEvents)) {
      matchData.ballEvents.forEach((evt) => {
        if (evt.isWicket && evt.fielderName) {
          const fielder = evt.fielderName.trim();
          if (fielder) {
            const p = getOrInitPlayer(fielder);
            const wType = (evt.wicketType || '').toLowerCase();
            if (wType === 'caught') {
              p.fielding.catches += 1;
            } else if (wType === 'stumped') {
              p.fielding.stumpings += 1;
            } else if (wType === 'runout') {
              p.fielding.runOuts += 1;
            }
          }
        }
      });
    }

    // 3. Persist and update player metrics in Database
    for (const name of Object.keys(playerUpdates)) {
      const updateData = playerUpdates[name];
      const isUnknown = name.endsWith('(unknown)');

      // Fetch or Create Player profile
      let player = await Player.findOne({ name });
      if (!player) {
        player = new Player({
          name,
          role: isUnknown ? 'Guest Player' : 'All-rounder',
          avatarUrl: isUnknown
            ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            : 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150',
        });
      }

      // Update Batting Career Stats
      if (updateData.batting) {
        const bat = updateData.batting;
        player.stats.batting.matches += 1;
        player.stats.batting.innings += 1;
        player.stats.batting.runs += bat.runs;
        player.stats.batting.ballsFaced += bat.ballsFaced;
        player.stats.batting.fours += bat.fours;
        player.stats.batting.sixes += bat.sixes;
        player.stats.batting.notOuts += bat.isOut ? 0 : 1;

        if (bat.runs >= 100) {
          player.stats.batting.hundreds += 1;
        } else if (bat.runs >= 50) {
          player.stats.batting.fifties += 1;
        }

        // Compare and update highest score
        let prevHighest = 0;
        let prevNotOut = false;
        if (player.stats.batting.highestScore) {
          prevNotOut = player.stats.batting.highestScore.endsWith('*');
          prevHighest = parseInt(player.stats.batting.highestScore.replace('*', ''), 10) || 0;
        }

        if (
          bat.runs > prevHighest ||
          (bat.runs === prevHighest && !prevNotOut && !bat.isOut)
        ) {
          player.stats.batting.highestScore = `${bat.runs}${bat.isOut ? '' : '*'}`;
        }

        // Recalculate average
        const dismissals = player.stats.batting.innings - player.stats.batting.notOuts;
        player.stats.batting.average =
          dismissals > 0
            ? parseFloat((player.stats.batting.runs / dismissals).toFixed(2))
            : player.stats.batting.runs;

        // Recalculate strike rate
        player.stats.batting.strikeRate =
          player.stats.batting.ballsFaced > 0
            ? parseFloat(((player.stats.batting.runs / player.stats.batting.ballsFaced) * 100).toFixed(2))
            : 0;
      }

      // Update Bowling Career Stats
      if (updateData.bowling) {
        const bowl = updateData.bowling;
        player.stats.bowling.matches += 1;
        player.stats.bowling.innings += 1;
        player.stats.bowling.wickets += bowl.wickets;
        player.stats.bowling.runsConceded += bowl.runsConceded;
        player.stats.bowling.ballsBowled += bowl.ballsBowled;

        if (bowl.wickets >= 5) {
          player.stats.bowling.fiveWickets += 1;
        } else if (bowl.wickets >= 3) {
          player.stats.bowling.threeWickets += 1;
        }

        // Compare and update best bowling
        let bestWkts = 0;
        let bestRuns = Infinity;
        if (player.stats.bowling.bestBowling && player.stats.bowling.bestBowling.includes('/')) {
          const parts = player.stats.bowling.bestBowling.split('/');
          bestWkts = parseInt(parts[0], 10) || 0;
          bestRuns = parseInt(parts[1], 10) || 0;
        }

        if (
          bowl.wickets > bestWkts ||
          (bowl.wickets === bestWkts && bowl.runsConceded < bestRuns)
        ) {
          player.stats.bowling.bestBowling = `${bowl.wickets}/${bowl.runsConceded}`;
        }

        // Recalculate economy, average, strike rate
        player.stats.bowling.economy =
          player.stats.bowling.ballsBowled > 0
            ? parseFloat(((player.stats.bowling.runsConceded / player.stats.bowling.ballsBowled) * 6).toFixed(2))
            : 0;

        player.stats.bowling.average =
          player.stats.bowling.wickets > 0
            ? parseFloat((player.stats.bowling.runsConceded / player.stats.bowling.wickets).toFixed(2))
            : 0;

        player.stats.bowling.strikeRate =
          player.stats.bowling.wickets > 0
            ? parseFloat((player.stats.bowling.ballsBowled / player.stats.bowling.wickets).toFixed(2))
            : 0;
      }

      // Update Fielding Career Stats
      player.stats.fielding.catches += updateData.fielding.catches;
      player.stats.fielding.stumpings += updateData.fielding.stumpings;
      player.stats.fielding.runOuts += updateData.fielding.runOuts;

      await player.save();
    }

    res.status(201).json({
      success: true,
      message: 'Match results published and career stats synchronized successfully',
      matchId: match.matchId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error publishing match results' });
  }
};

const getPlayerMatches = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);

    // Find player first to resolve name & username
    const player = await Player.findOne({
      $or: [
        { name },
        { username: name },
      ],
    });

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Search all matches where this player participated (batting scorecard or bowling scorecard)
    const matches = await Match.find({
      $or: [
        { 'innings.battingScorecard.name': player.name },
        { 'innings.bowlingScorecard.name': player.name },
        { 'innings.battingScorecard.name': player.username },
        { 'innings.bowlingScorecard.name': player.username },
      ],
    }).sort({ date: -1 });

    // Map match items to include basic details and the specific player's match performance
    const formattedMatches = matches.map((match) => {
      const playerPerformance = { batted: false, bowled: false };

      // Find batting & bowling scorecard entries for this match
      for (const inn of match.innings) {
        const batEntry = inn.battingScorecard.find(
          (b) => b.name === player.name || b.name === player.username
        );
        if (batEntry) {
          playerPerformance.batted = true;
          playerPerformance.runs = batEntry.runs;
          playerPerformance.balls = batEntry.ballsFaced;
          playerPerformance.fours = batEntry.fours;
          playerPerformance.sixes = batEntry.sixes;
          playerPerformance.isOut = batEntry.isOut;
          playerPerformance.dismissalType = batEntry.dismissalType;
          playerPerformance.dismissedBy = batEntry.dismissedBy;
          playerPerformance.fielderName = batEntry.fielderName || null;
          playerPerformance.dismissalSummary = getDismissalSummary(batEntry);
        }

        const bowlEntry = inn.bowlingScorecard.find(
          (b) => b.name === player.name || b.name === player.username
        );
        if (bowlEntry) {
          playerPerformance.bowled = true;
          playerPerformance.wickets = bowlEntry.wickets;
          playerPerformance.runsConceded = bowlEntry.runsConceded;
          playerPerformance.ballsBowled = bowlEntry.ballsBowled;
          playerPerformance.maidens = bowlEntry.maidens;
          playerPerformance.economy = bowlEntry.economy;
        }
      }

      return {
        matchId: match.matchId,
        date: match.date,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        teamAScore: match.teamAScore,
        teamAWickets: match.teamAWickets,
        teamBScore: match.teamBScore,
        teamBWickets: match.teamBWickets,
        winner: match.winner,
        playerOfTheMatch: match.playerOfTheMatch,
        oversCount: match.oversCount,
        playerPerformance,
      };
    });

    res.status(200).json(formattedMatches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving player matches' });
  }
};

const getMatchDetails = async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const match = await Match.findOne({ matchId });

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Calculate summary string (e.g. "Team A won by 15 runs" or "Team A won by 4 wickets")
    let summary = 'Match Result Pending';
    if (match.winner) {
      const winner = match.winner;
      const scoreA = match.teamAScore;
      const scoreB = match.teamBScore;
      const isTeamAWinner = winner.toLowerCase() === match.teamAName.toLowerCase();
      const winnerScore = isTeamAWinner ? scoreA : scoreB;
      const loserScore = isTeamAWinner ? scoreB : scoreA;

      if (winner.toLowerCase() === 'tie' || winner.toLowerCase() === 'draw') {
        summary = 'Match Tied';
      } else if (match.innings && match.innings.length >= 2) {
        const firstInnings = match.innings[0];
        const isWinnerBattingFirst = firstInnings.battingTeam.toLowerCase() === winner.toLowerCase();

        if (isWinnerBattingFirst) {
          const marginRuns = winnerScore - loserScore;
          summary = `${winner} won by ${marginRuns} run${marginRuns > 1 ? 's' : ''}`;
        } else {
          const maxWickets = match.playersPerTeam - 1;
          const secondInnings = match.innings[1];
          const wicketsFallen = secondInnings.wickets || 0;
          const marginWickets = maxWickets - wicketsFallen;
          summary = `${winner} won by ${marginWickets} wicket${marginWickets > 1 ? 's' : ''}`;
        }
      } else {
        summary = `${winner} won`;
      }
    }

    // Calculate Top Performers of this match
    let bestBatsman = null;
    let bestBowler = null;

    match.innings.forEach((inn) => {
      // Find batsman with max runs
      if (inn.battingScorecard) {
        inn.battingScorecard.forEach((bat) => {
          if (!bestBatsman || bat.runs > bestBatsman.runs) {
            bestBatsman = {
              name: bat.name,
              runs: bat.runs,
              balls: bat.ballsFaced,
              strikeRate: bat.ballsFaced > 0 ? parseFloat(((bat.runs / bat.ballsFaced) * 100).toFixed(2)) : 0,
            };
          }
        });
      }

      // Find bowler with max wickets, then min runs conceded
      if (inn.bowlingScorecard) {
        inn.bowlingScorecard.forEach((bowl) => {
          const isBetter =
            !bestBowler ||
            bowl.wickets > bestBowler.wickets ||
            (bowl.wickets === bestBowler.wickets && bowl.runsConceded < bestBowler.runsConceded);

          if (isBetter) {
            bestBowler = {
              name: bowl.name,
              wickets: bowl.wickets,
              runsConceded: bowl.runsConceded,
              balls: bowl.ballsBowled,
            };
          }
        });
      }
    });

    // Convert match document to plain object to enrich it
    const matchObj = match.toObject();

    if (matchObj.innings && Array.isArray(matchObj.innings)) {
      matchObj.innings.forEach((inn) => {
        if (inn.battingScorecard && Array.isArray(inn.battingScorecard)) {
          inn.battingScorecard.forEach((bat) => {
            bat.dismissalSummary = getDismissalSummary(bat);
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      match: matchObj,
      summary,
      topPerformers: {
        batsman: bestBatsman,
        bowler: bestBowler,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving match details' });
  }
};

const undoMatch = async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);

    // 1. Locate the match to be deleted
    const match = await Match.findOne({ matchId });
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Identify all players involved in scorecards and events
    const playerUpdates = {};

    const getOrInitPlayer = (name) => {
      const trimmedName = name.trim();
      if (!playerUpdates[trimmedName]) {
        playerUpdates[trimmedName] = {
          name: trimmedName,
          batting: null,
          bowling: null,
          fielding: { catches: 0, stumpings: 0, runOuts: 0 },
        };
      }
      return playerUpdates[trimmedName];
    };

    // Parse scorecards to gather stats that need to be decremented
    if (match.innings && Array.isArray(match.innings)) {
      match.innings.forEach((inning) => {
        // Batting
        if (inning.battingScorecard && Array.isArray(inning.battingScorecard)) {
          inning.battingScorecard.forEach((bat) => {
            if (!bat.name) return;
            const p = getOrInitPlayer(bat.name);
            p.batting = {
              runs: bat.runs || 0,
              ballsFaced: bat.ballsFaced || 0,
              fours: bat.fours || 0,
              sixes: bat.sixes || 0,
              isOut: bat.isOut || false,
            };
          });
        }

        // Bowling
        if (inning.bowlingScorecard && Array.isArray(inning.bowlingScorecard)) {
          inning.bowlingScorecard.forEach((bowl) => {
            if (!bowl.name) return;
            const p = getOrInitPlayer(bowl.name);
            p.bowling = {
              ballsBowled: bowl.ballsBowled || 0,
              runsConceded: bowl.runsConceded || 0,
              wickets: bowl.wickets || 0,
            };
          });
        }
      });
    }

    // Parse fielding events to gather stats to decrement
    if (match.ballEvents && Array.isArray(match.ballEvents)) {
      match.ballEvents.forEach((evt) => {
        if (evt.isWicket && evt.fielderName) {
          const fielder = evt.fielderName.trim();
          if (fielder) {
            const p = getOrInitPlayer(fielder);
            const wType = (evt.wicketType || '').toLowerCase();
            if (wType === 'caught') {
              p.fielding.catches += 1;
            } else if (wType === 'stumped') {
              p.fielding.stumpings += 1;
            } else if (wType === 'runout') {
              p.fielding.runOuts += 1;
            }
          }
        }
      });
    }

    // 2. Revert player statistics
    for (const name of Object.keys(playerUpdates)) {
      const updateData = playerUpdates[name];

      // Find player profile
      const player = await Player.findOne({ name });
      if (!player) continue; // If player somehow doesn't exist, skip

      // Revert Batting Career Stats
      if (updateData.batting) {
        const bat = updateData.batting;
        player.stats.batting.matches = Math.max(0, player.stats.batting.matches - 1);
        player.stats.batting.innings = Math.max(0, player.stats.batting.innings - 1);
        player.stats.batting.runs = Math.max(0, player.stats.batting.runs - bat.runs);
        player.stats.batting.ballsFaced = Math.max(0, player.stats.batting.ballsFaced - bat.ballsFaced);
        player.stats.batting.fours = Math.max(0, player.stats.batting.fours - bat.fours);
        player.stats.batting.sixes = Math.max(0, player.stats.batting.sixes - bat.sixes);
        player.stats.batting.notOuts = Math.max(0, player.stats.batting.notOuts - (bat.isOut ? 0 : 1));

        if (bat.runs >= 100) {
          player.stats.batting.hundreds = Math.max(0, player.stats.batting.hundreds - 1);
        } else if (bat.runs >= 50) {
          player.stats.batting.fifties = Math.max(0, player.stats.batting.fifties - 1);
        }

        // Recalculate highest score from other matches
        const otherBattingMatches = await Match.find({
          matchId: { $ne: matchId },
          $or: [
            { 'innings.battingScorecard.name': player.name },
            { 'innings.battingScorecard.name': player.username },
          ],
        });

        let maxRuns = 0;
        let isNotOut = false;
        otherBattingMatches.forEach((m) => {
          m.innings.forEach((inn) => {
            const b = inn.battingScorecard.find(
              (x) => x.name === player.name || x.name === player.username
            );
            if (b) {
              if (b.runs > maxRuns || (b.runs === maxRuns && !isNotOut && !b.isOut)) {
                maxRuns = b.runs;
                isNotOut = !b.isOut;
              }
            }
          });
        });
        player.stats.batting.highestScore = maxRuns > 0 ? `${maxRuns}${isNotOut ? '*' : ''}` : '0';

        // Recalculate average
        const dismissals = player.stats.batting.innings - player.stats.batting.notOuts;
        player.stats.batting.average =
          dismissals > 0
            ? parseFloat((player.stats.batting.runs / dismissals).toFixed(2))
            : player.stats.batting.runs;

        // Recalculate strike rate
        player.stats.batting.strikeRate =
          player.stats.batting.ballsFaced > 0
            ? parseFloat(((player.stats.batting.runs / player.stats.batting.ballsFaced) * 100).toFixed(2))
            : 0;
      }

      // Revert Bowling Career Stats
      if (updateData.bowling) {
        const bowl = updateData.bowling;
        player.stats.bowling.matches = Math.max(0, player.stats.bowling.matches - 1);
        player.stats.bowling.innings = Math.max(0, player.stats.bowling.innings - 1);
        player.stats.bowling.wickets = Math.max(0, player.stats.bowling.wickets - bowl.wickets);
        player.stats.bowling.runsConceded = Math.max(0, player.stats.bowling.runsConceded - bowl.runsConceded);
        player.stats.bowling.ballsBowled = Math.max(0, player.stats.bowling.ballsBowled - bowl.ballsBowled);

        if (bowl.wickets >= 5) {
          player.stats.bowling.fiveWickets = Math.max(0, player.stats.bowling.fiveWickets - 1);
        } else if (bowl.wickets >= 3) {
          player.stats.bowling.threeWickets = Math.max(0, player.stats.bowling.threeWickets - 1);
        }

        // Recalculate best bowling from other matches
        const otherBowlingMatches = await Match.find({
          matchId: { $ne: matchId },
          $or: [
            { 'innings.bowlingScorecard.name': player.name },
            { 'innings.bowlingScorecard.name': player.username },
          ],
        });

        let bestWkts = 0;
        let bestRuns = Infinity;
        otherBowlingMatches.forEach((m) => {
          m.innings.forEach((inn) => {
            const bl = inn.bowlingScorecard.find(
              (x) => x.name === player.name || x.name === player.username
            );
            if (bl) {
              if (
                bl.wickets > bestWkts ||
                (bl.wickets === bestWkts && bl.runsConceded < bestRuns)
              ) {
                bestWkts = bl.wickets;
                bestRuns = bl.runsConceded;
              }
            }
          });
        });
        player.stats.bowling.bestBowling =
          bestWkts > 0 || bestRuns < Infinity ? `${bestWkts}/${bestRuns}` : '0/0';

        // Recalculate economy, average, strike rate
        player.stats.bowling.economy =
          player.stats.bowling.ballsBowled > 0
            ? parseFloat(((player.stats.bowling.runsConceded / player.stats.bowling.ballsBowled) * 6).toFixed(2))
            : 0;

        player.stats.bowling.average =
          player.stats.bowling.wickets > 0
            ? parseFloat((player.stats.bowling.runsConceded / player.stats.bowling.wickets).toFixed(2))
            : 0;

        player.stats.bowling.strikeRate =
          player.stats.bowling.wickets > 0
            ? parseFloat((player.stats.bowling.ballsBowled / player.stats.bowling.wickets).toFixed(2))
            : 0;
      }

      // Revert Fielding Career Stats
      player.stats.fielding.catches = Math.max(0, player.stats.fielding.catches - updateData.fielding.catches);
      player.stats.fielding.stumpings = Math.max(0, player.stats.fielding.stumpings - updateData.fielding.stumpings);
      player.stats.fielding.runOuts = Math.max(0, player.stats.fielding.runOuts - updateData.fielding.runOuts);

      // Clean up Guest players who have no more matches remaining
      const totalMatchesPlayed = player.stats.batting.matches + player.stats.bowling.matches;
      if (name.endsWith('(unknown)') && totalMatchesPlayed === 0) {
        await Player.deleteOne({ _id: player._id });
      } else {
        await player.save();
      }
    }

    // 3. Remove Match document
    await Match.deleteOne({ _id: match._id });

    res.status(200).json({
      success: true,
      message: `Match results for Match ID ${matchId} successfully undone and deleted.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during undoing match results' });
  }
};

module.exports = {
  publishMatch,
  getPlayerMatches,
  getMatchDetails,
  undoMatch,
};
