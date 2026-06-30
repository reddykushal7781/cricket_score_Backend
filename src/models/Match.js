const mongoose = require('mongoose');

const ExtraSchema = new mongoose.Schema({
  wide: { type: Number, default: 0 },
  noball: { type: Number, default: 0 },
  bye: { type: Number, default: 0 },
  legbye: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const BattingScorecardSchema = new mongoose.Schema({
  playerId: { type: Number },
  name: { type: String, required: true },
  runs: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  dismissalType: { type: String, default: 'none' },
  dismissedBy: { type: String, default: null },
  fielderName: { type: String, default: null },
}, { _id: false });

const BowlingScorecardSchema = new mongoose.Schema({
  playerId: { type: Number },
  name: { type: String, required: true },
  ballsBowled: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  economy: { type: Number, default: 0 },
}, { _id: false });

const InningsSchema = new mongoose.Schema({
  inningsIndex: { type: Number, required: true },
  battingTeam: { type: String, required: true },
  bowlingTeam: { type: String, required: true },
  totalRuns: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  ballsBowled: { type: Number, default: 0 },
  extras: ExtraSchema,
  battingScorecard: [BattingScorecardSchema],
  bowlingScorecard: [BowlingScorecardSchema],
}, { _id: false });

const BallEventSchema = new mongoose.Schema({
  inningsIndex: { type: Number, required: true },
  overNumber: { type: Number, required: true },
  ballNumber: { type: Number, required: true },
  batsmanName: { type: String, required: true },
  bowlerName: { type: String, required: true },
  runs: { type: Number, default: 0 },
  isWicket: { type: Number, default: 0 },
  wicketType: { type: String, default: 'none' },
  fielderName: { type: String, default: null },
  extraRuns: { type: Number, default: 0 },
  extraType: { type: String, default: 'none' },
}, { _id: false });

const MatchSchema = new mongoose.Schema({
  matchId: { type: Number, required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  teamAName: { type: String, required: true },
  teamBName: { type: String, required: true },
  groupName: { type: String, default: null },
  oversCount: { type: Number, required: true },
  playersPerTeam: { type: Number, required: true },
  winner: { type: String },
  playerOfTheMatch: { type: String, default: null },
  teamAScore: { type: Number, default: 0 },
  teamAWickets: { type: Number, default: 0 },
  teamABallsBowled: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  teamBWickets: { type: Number, default: 0 },
  teamBBallsBowled: { type: Number, default: 0 },
  innings: [InningsSchema],
  ballEvents: [BallEventSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Match', MatchSchema);
