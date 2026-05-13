const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupLocation: {
    address: String,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [lng, lat]
    },
  },
  dropLocation: {
    address: String,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
    },
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'],
    default: 'requested',
  },
  fare: {
    type: Number,
    required: true,
  },
  distance: Number,
  duration: Number,
  vehicleType: {
    type: String,
    enum: ['bike', 'car', 'auto'],
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'wallet', 'card'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  otp: String,
  rating: {
    rider: Number,
    driver: Number,
  },
  review: {
    rider: String,
    driver: String,
  },
}, {
  timestamps: true,
});

rideSchema.index({ 'pickupLocation.location': '2dsphere' });
rideSchema.index({ 'dropLocation.location': '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
