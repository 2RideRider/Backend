const User = require('../../models/User');
const Ride = require('../../models/Ride');
const Rider = require('../../models/Rider');
const Captain = require('../../models/Captain');
const DriverDocument = require('../../models/DriverDocument');
const jwt = require('jsonwebtoken');

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '1d',
  });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d',
  });

// ─── Helper: check if email/phone already exists across all collections ───────

const checkUserExists = async (email, phone) => {
  const [riderExists, captainExists, adminExists] = await Promise.all([
    Rider.findOne({ $or: [{ email }, { phone }] }),
    Captain.findOne({ $or: [{ email }, { phone }] }),
    User.findOne({ $or: [{ email }, { phone }] }),
  ]);
  return riderExists || captainExists || adminExists;
};

// ─── Helper: find user across all collections by email ───────────────────────

const findUserByEmailOrPhone = async (identifier) => {
  let user = await Rider.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select('+password');
  if (!user) user = await Captain.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select('+password');
  if (!user) user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select('+password');
  return user;
};

// ─── Helper: find user across all collections by id ──────────────────────────

const findUserById = async (id) => {
  let user = await Rider.findById(id);
  if (!user) user = await Captain.findById(id);
  if (!user) user = await User.findById(id);
  return user;
};

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  // ─── Queries ──────────────────────────────────────────────────────────────

  Query: {
    me: async (_, __, { user }) => {
      if (!user) return null;
      return findUserById(user.id);
    },

    getRides: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await findUserById(user.id);

      if (currentUser && currentUser.role === 'admin') {
        return Ride.find({}).populate('rider driver').sort({ createdAt: -1 });
      }
      return Ride.find({
        $or: [{ rider: user.id }, { driver: user.id }],
      })
        .populate('rider driver')
        .sort({ createdAt: -1 });
    },

    getRide: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Ride.findById(id).populate('rider driver');
    },

    estimateFare: async (_, { pickup, drop, vehicleType }) => {
      // Haversine distance in km
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(drop[1] - pickup[1]);
      const dLon = toRad(drop[0] - pickup[0]);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(pickup[1])) *
          Math.cos(toRad(drop[1])) *
          Math.sin(dLon / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const ratePerKm = { bike: 8, auto: 12, car: 18 };
      const baseFare = { bike: 20, auto: 25, car: 40 };
      const rate = ratePerKm[vehicleType] || 15;
      const base = baseFare[vehicleType] || 30;
      return Math.round(base + distanceKm * rate);
    },

    getDriverStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const captain = await Captain.findById(user.id);
      const completedRides = await Ride.countDocuments({
        driver: user.id,
        status: 'completed',
      });
      return {
        totalEarnings: captain?.earnings?.total ?? 0,
        todayEarnings: captain?.earnings?.today ?? 0,
        completedRides,
        rating: captain?.ratings ?? 0,
      };
    },

    getDriverDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return DriverDocument.find({ driver: user.id }).populate('driver');
    },

    getAvailableRides: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Ride.find({ status: 'requested' }).populate('rider');
    },

    // Admin Queries ────────────────────────────────────────────────────────────

    getAllUsers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');
      return Rider.find({}).sort({ createdAt: -1 });
    },

    getAllDrivers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');
      return Captain.find({}).populate('currentRide').sort({ createdAt: -1 });
    },

    getAdminStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');

      const [totalRiders, totalDrivers, totalRides, activeRides, pendingDrivers, completedRides] =
        await Promise.all([
          Rider.countDocuments({}),
          Captain.countDocuments({}),
          Ride.countDocuments({}),
          Ride.countDocuments({ status: { $in: ['accepted', 'started'] } }),
          Captain.countDocuments({ documentsVerified: false }),
          Ride.find({ status: 'completed' }),
        ]);

      const totalEarnings = completedRides.reduce((acc, r) => acc + (r.fare || 0), 0);
      return { totalRiders, totalDrivers, totalRides, totalEarnings, activeRides, pendingDrivers };
    },

    getAllDriverDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');
      return DriverDocument.find({}).populate('driver').sort({ createdAt: -1 });
    },

    getSystemConfig: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');

      const services = [
        { key: 'MongoDB URI', configured: !!process.env.MONGODB_URI, value: process.env.MONGODB_URI ? 'Connected (Atlas)' : 'Not Set' },
        { key: 'JWT Secret Key', configured: !!process.env.JWT_SECRET, value: process.env.JWT_SECRET ? 'Configured' : 'Not Set' },
        { key: 'Cloudinary Uploads', configured: !!process.env.CLOUDINARY_CLOUD_NAME, value: process.env.CLOUDINARY_CLOUD_NAME || 'Not Set' },
        { key: 'Razorpay Payments', configured: !!process.env.RAZORPAY_KEY_ID, value: process.env.RAZORPAY_KEY_ID ? 'Enabled' : 'Not Set' },
        { key: 'Stripe Payments', configured: !!process.env.STRIPE_SECRET_KEY, value: process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Not Set' },
        { key: 'Google Maps API', configured: !!process.env.GOOGLE_MAPS_API_KEY, value: process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not Set' },
        { key: 'Twilio SMS', configured: !!process.env.TWILIO_ACCOUNT_SID, value: process.env.TWILIO_ACCOUNT_SID ? 'Active' : 'Not Set' },
        { key: 'Firebase Messaging (FCM)', configured: !!process.env.FCM_SERVER_KEY, value: process.env.FCM_SERVER_KEY ? 'Configured' : 'Not Set' },
        { key: 'Email SMTP (Nodemailer)', configured: !!process.env.NODEMAILER_USER, value: process.env.NODEMAILER_USER || 'Not Set' },
      ];

      return { port: parseInt(process.env.PORT) || 5000, dbHost: 'MongoDB Cloud Atlas', services };
    },
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  Mutation: {
    // ── Rider Registration ────────────────────────────────────────────────────
    registerRider: async (_, { name, email, phone, password }) => {
      const exists = await checkUserExists(email, phone);
      if (exists) throw new Error('An account with this email or phone already exists');

      const rider = await Rider.create({ name, email, phone, password, role: 'rider' });

      return {
        token: generateToken(rider._id),
        refreshToken: generateRefreshToken(rider._id),
        user: rider,
      };
    },

    // ── Captain Registration ──────────────────────────────────────────────────
    registerCaptain: async (_, { name, email, phone, password, vehicle }) => {
      const exists = await checkUserExists(email, phone);
      if (exists) throw new Error('An account with this email or phone already exists');

      const captain = await Captain.create({
        name,
        email,
        phone,
        password,
        role: 'driver',
        vehicle: {
          type: vehicle.type,
          model: vehicle.model || '',
          plateNumber: vehicle.plateNumber,
          color: vehicle.color || '',
        },
      });

      return {
        token: generateToken(captain._id),
        refreshToken: generateRefreshToken(captain._id),
        captain,
      };
    },

    // ── Legacy Register (kept for backward compat) ────────────────────────────
    register: async (_, { name, email, phone, password, role, vehicleType, vehicleModel, plateNumber, vehicleColor }) => {
      const exists = await checkUserExists(email, phone);
      if (exists) throw new Error('User already exists');

      let user;
      if (role === 'driver') {
        user = await Captain.create({
          name,
          email,
          phone,
          password,
          role: 'driver',
          vehicle: {
            type: vehicleType || 'car',
            plateNumber: plateNumber || `TEMP-${Math.floor(1000 + Math.random() * 9000)}`,
            model: vehicleModel || 'Not Provided',
            color: vehicleColor || 'Not Provided',
          },
        });
      } else if (role === 'admin') {
        user = await User.create({ name, email, phone, password, role: 'admin' });
      } else {
        user = await Rider.create({ name, email, phone, password, role: 'rider' });
      }

      return {
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
        user,
      };
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    login: async (_, { email, password }) => {
      const user = await findUserByEmailOrPhone(email);

      if (!user) throw new Error('Invalid email or password');

      const isMatch = await user.matchPassword(password);
      if (!isMatch) throw new Error('Invalid email or password');

      return {
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
        user,
      };
    },

    // ── Ride Mutations ────────────────────────────────────────────────────────

    requestRide: async (_, args, { user, io }) => {
      if (!user) throw new Error('Not authenticated');

      const ride = await Ride.create({
        rider: user.id,
        pickupLocation: {
          address: args.pickupAddress,
          location: { type: 'Point', coordinates: args.pickupCoords },
        },
        dropLocation: {
          address: args.dropAddress,
          location: { type: 'Point', coordinates: args.dropCoords },
        },
        vehicleType: args.vehicleType,
        fare: args.fare,
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
      });

      if (io) io.emit('newRideRequest', ride);
      return ride;
    },

    acceptRide: async (_, { rideId }, { user, io }) => {
      if (!user) throw new Error('Not authenticated');

      const ride = await Ride.findByIdAndUpdate(
        rideId,
        { driver: user.id, status: 'accepted' },
        { new: true }
      ).populate('rider driver');

      if (io && ride?.rider) io.to(ride.rider.id.toString()).emit('rideAccepted', ride);
      return ride;
    },

    updateRideStatus: async (_, { rideId, status, otp }, { user, io }) => {
      if (!user) throw new Error('Not authenticated');

      const ride = await Ride.findById(rideId).populate('rider');
      if (!ride) throw new Error('Ride not found');

      if (status === 'started') {
        if (ride.otp !== otp) throw new Error('Invalid OTP');
      }

      ride.status = status;
      await ride.save();

      if (io && ride.rider) {
        io.to(ride.rider.id.toString()).emit('rideStatusUpdated', { rideId, status });
      }
      return ride;
    },

    // ── Location / Online Status ───────────────────────────────────────────────

    updateLocation: async (_, { lat, lng }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      // Try updating in Rider first, then Captain
      let updated = await Rider.findByIdAndUpdate(
        user.id,
        { location: { type: 'Point', coordinates: [lng, lat] } },
        { new: true }
      );
      if (!updated) {
        updated = await Captain.findByIdAndUpdate(
          user.id,
          { location: { type: 'Point', coordinates: [lng, lat] } },
          { new: true }
        );
      }
      return updated;
    },

    toggleOnline: async (_, { isOnline }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Captain.findByIdAndUpdate(user.id, { isOnline }, { new: true });
    },

    uploadDocument: async (_, { type, documentUrl }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      let doc = await DriverDocument.findOne({ driver: user.id, type });
      if (doc) {
        doc.documentUrl = documentUrl;
        doc.status = 'pending';
        await doc.save();
      } else {
        doc = await DriverDocument.create({ driver: user.id, type, documentUrl, status: 'pending' });
      }
      return doc;
    },

    deleteDocument: async (_, { type }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await DriverDocument.findOne({ driver: user.id, type });
      if (!doc) return false;
      await DriverDocument.deleteOne({ driver: user.id, type });
      await Captain.findByIdAndUpdate(user.id, { documentsVerified: false });
      return true;
    },

    // ── Admin Mutations ───────────────────────────────────────────────────────

    updateUserVerification: async (_, { userId, isVerified }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');
      return Rider.findByIdAndUpdate(userId, { isVerified }, { new: true });
    },

    updateDriverVerification: async (_, { driverId, documentsVerified }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');
      return Captain.findByIdAndUpdate(driverId, { documentsVerified }, { new: true });
    },

    updateDocumentStatus: async (_, { documentId, status, rejectionReason }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const admin = await User.findById(user.id);
      if (!admin || admin.role !== 'admin') throw new Error('Not authorized as admin');

      const doc = await DriverDocument.findByIdAndUpdate(
        documentId,
        { status, rejectionReason },
        { new: true }
      ).populate('driver');

      if (status === 'approved' && doc?.driver) {
        const docs = await DriverDocument.find({ driver: doc.driver._id });
        const allApproved = docs.length >= 3 && docs.every((d) => d.status === 'approved');
        if (allApproved) await Captain.findByIdAndUpdate(doc.driver._id, { documentsVerified: true });
      } else if (status === 'rejected' && doc?.driver) {
        await Captain.findByIdAndUpdate(doc.driver._id, { documentsVerified: false });
      }

      return doc;
    },
  },

  // ─── Type Resolvers ───────────────────────────────────────────────────────

  Driver: {
    // Captain IS the user in this system — expose fields directly
    user: (parent) => parent,
  },

  Ride: {
    // Resolve nested location coordinates from Mongoose model structure
    pickupLocation: (parent) => ({
      address: parent.pickupLocation?.address,
      coordinates: parent.pickupLocation?.location?.coordinates,
    }),
    dropLocation: (parent) => ({
      address: parent.dropLocation?.address,
      coordinates: parent.dropLocation?.location?.coordinates,
    }),
  },
};

module.exports = resolvers;
