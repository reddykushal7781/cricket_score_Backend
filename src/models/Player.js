const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  username: {
    type: String,
    default: '',
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150',
  },
  role: {
    type: String,
    default: 'All-rounder',
  },
  battingStyle: {
    type: String,
    default: 'Right-hand bat',
  },
  bowlingStyle: {
    type: String,
    default: 'Right-arm medium',
  },
  stats: {
    batting: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      highestScore: { type: String, default: '0' },
      notOuts: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
    },
    bowling: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      ballsBowled: { type: Number, default: 0 },
      economy: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      bestBowling: { type: String, default: '0/0' },
      threeWickets: { type: Number, default: 0 },
      fiveWickets: { type: Number, default: 0 },
    },
    fielding: {
      catches: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Player', PlayerSchema);
