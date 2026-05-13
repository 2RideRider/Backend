const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'car', 'auto'],
      required: true,
    },
    model: String,
    plateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    color: String,
  },
  license: {
    number: String,
    expiryDate: Date,
    image: String,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
  },
  earnings: {
    total: { type: Number, default: 0 },
    today: { type: Number, default: 0 },
  },
  documentsVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Driver', driverSchema);
