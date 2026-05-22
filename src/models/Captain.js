const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const captainSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    default: 'driver',
  },
  profileImage: {
    type: String,
    default: 'default-profile.png',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  fcmToken: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  ratings: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  // Driver/Captain specific fields
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

// Geo-spatial index
captainSchema.index({ location: '2dsphere' });

// Encrypt password using bcrypt
captainSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
captainSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Captain', captainSchema);
