const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Captain',
    required: true,
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
  },
  amount: {
    type: Number,
    required: true,
  },
  commission: {
    type: Number,
    default: 0,
  },
  incentive: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['ride', 'incentive', 'referral', 'adjustment'],
    default: 'ride',
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Earning', earningSchema);
