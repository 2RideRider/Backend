const mongoose = require('mongoose');

const driverDocumentSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Captain',
    required: true,
  },
  type: {
    type: String,
    enum: ['license', 'rc', 'insurance', 'aadhaar', 'vehicle_front', 'vehicle_back'],
    required: true,
  },
  documentUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  expiryDate: Date,
  rejectionReason: String,
}, {
  timestamps: true,
});

module.exports = mongoose.model('DriverDocument', driverDocumentSchema);
