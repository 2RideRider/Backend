const User = require('../../models/User');
const Ride = require('../../models/Ride');
const Driver = require('../../models/Driver');
const DriverDocument = require('../../models/DriverDocument');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRE });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRE });
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) return null;
      return await User.findById(user.id);
    },
    getRides: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (currentUser && currentUser.role === 'admin') {
        return await Ride.find({}).populate('rider driver').sort({ createdAt: -1 });
      }
      return await Ride.find({ $or: [{ rider: user.id }, { driver: user.id }] }).populate('rider driver').sort({ createdAt: -1 });
    },
    getDriverStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // Simplified logic
      return {
        totalEarnings: 1500.50,
        todayEarnings: 450.00,
        completedRides: 12,
        rating: 4.8,
      };
    },
    getDriverDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await DriverDocument.find({ driver: user.id }).populate('driver');
    },
    getAvailableRides: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Ride.find({ status: 'requested' }).populate('rider');
    },

    // Admin Queries
    getAllUsers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      return await User.find({}).sort({ createdAt: -1 });
    },
    getAllDrivers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      return await Driver.find({}).populate('user currentRide').sort({ createdAt: -1 });
    },
    getAdminStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }

      const totalRiders = await User.countDocuments({ role: 'rider' });
      const totalDrivers = await User.countDocuments({ role: 'driver' });
      const totalRides = await Ride.countDocuments({});
      const activeRides = await Ride.countDocuments({ status: { $in: ['accepted', 'started'] } });
      
      const completedRidesList = await Ride.find({ status: 'completed' });
      const totalEarnings = completedRidesList.reduce((acc, r) => acc + (r.fare || 0), 0);

      const pendingDrivers = await Driver.countDocuments({ documentsVerified: false });

      return {
        totalRiders,
        totalDrivers,
        totalRides,
        totalEarnings,
        activeRides,
        pendingDrivers,
      };
    },
    getAllDriverDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      return await DriverDocument.find({}).populate('driver').sort({ createdAt: -1 });
    },
    getSystemConfig: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }

      const services = [
        { key: 'MongoDB URI', configured: !!process.env.MONGODB_URI, value: process.env.MONGODB_URI ? 'Connected (Atlas)' : 'Not Set' },
        { key: 'JWT Secret Key', configured: !!process.env.JWT_SECRET, value: process.env.JWT_SECRET ? 'Configured' : 'Not Set' },
        { key: 'Cloudinary Uploads', configured: !!process.env.CLOUDINARY_CLOUD_NAME, value: process.env.CLOUDINARY_CLOUD_NAME || 'Not Set' },
        { key: 'Razorpay Payments', configured: !!process.env.RAZORPAY_KEY_ID, value: process.env.RAZORPAY_KEY_ID ? 'Enabled' : 'Not Set' },
        { key: 'Stripe Payments', configured: !!process.env.STRIPE_SECRET_KEY, value: process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Not Set' },
        { key: 'Google Maps API', configured: !!process.env.GOOGLE_MAPS_API_KEY, value: process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Not Set' },
        { key: 'Twilio SMS Integration', configured: !!process.env.TWILIO_ACCOUNT_SID, value: process.env.TWILIO_ACCOUNT_SID ? 'Active' : 'Not Set' },
        { key: 'Firebase Messaging (FCM)', configured: !!process.env.FCM_SERVER_KEY, value: process.env.FCM_SERVER_KEY ? 'Configured' : 'Not Set' },
        { key: 'Email SMTP (Nodemailer)', configured: !!process.env.NODEMAILER_USER, value: process.env.NODEMAILER_USER || 'Not Set' },
      ];

      return {
        port: parseInt(process.env.PORT) || 5000,
        dbHost: 'MongoDB Cloud Atlas',
        services,
      };
    },
  },
  Mutation: {
    register: async (_, { name, email, phone, password, role }) => {
      const userExists = await User.findOne({ $or: [{ email }, { phone }] });
      if (userExists) throw new Error('User already exists');

      const user = await User.create({ name, email, phone, password, role });

      // If registered as driver, create default driver details
      if (role === 'driver') {
        await Driver.create({
          user: user._id,
          vehicle: {
            type: 'car',
            plateNumber: `PLATE-${Math.floor(1000 + Math.random() * 9000)}`,
            model: 'Standard Sedan',
            color: 'White'
          },
          license: {
            number: 'NOT_PROVIDED',
            expiryDate: new Date(),
            image: ''
          }
        });
      }

      return {
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
        user,
      };
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.matchPassword(password))) {
        throw new Error('Invalid credentials');
      }

      return {
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
        user,
      };
    },
    requestRide: async (_, args, { user, io }) => {
      if (!user) throw new Error('Not authenticated');

      const ride = await Ride.create({
        rider: user.id,
        pickupLocation: {
          address: args.pickupAddress,
          location: { coordinates: args.pickupCoords },
        },
        dropLocation: {
          address: args.dropAddress,
          location: { coordinates: args.dropCoords },
        },
        vehicleType: args.vehicleType,
        fare: args.fare,
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
      });

      // Broadcast to nearby drivers
      io.emit('newRideRequest', ride);

      return ride;
    },
    acceptRide: async (_, { rideId }, { user, io }) => {
      if (!user) throw new Error('Not authenticated');
      
      const ride = await Ride.findByIdAndUpdate(
        rideId,
        { driver: user.id, status: 'accepted' },
        { new: true }
      ).populate('rider');

      // Notify rider
      io.to(ride.rider.id).emit('rideAccepted', ride);

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

      // Notify rider
      io.to(ride.rider.id).emit('rideStatusUpdated', { rideId, status });

      return ride;
    },
    toggleOnline: async (_, { isOnline }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await User.findByIdAndUpdate(user.id, { isOnline }, { new: true });
    },
    uploadDocument: async (_, { type, documentUrl }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      let doc = await DriverDocument.findOne({ driver: user.id, type });
      if (doc) {
        doc.documentUrl = documentUrl;
        doc.status = 'pending';
        await doc.save();
      } else {
        doc = await DriverDocument.create({
          driver: user.id,
          type,
          documentUrl,
          status: 'pending'
        });
      }
      return doc;
    },

    // Admin Mutations
    updateUserVerification: async (_, { userId, isVerified }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      return await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
    },
    updateDriverVerification: async (_, { driverId, documentsVerified }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      return await Driver.findByIdAndUpdate(driverId, { documentsVerified }, { new: true }).populate('user');
    },
    updateDocumentStatus: async (_, { documentId, status, rejectionReason }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const currentUser = await User.findById(user.id);
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Not authorized as admin');
      }
      
      const doc = await DriverDocument.findByIdAndUpdate(
        documentId, 
        { status, rejectionReason }, 
        { new: true }
      ).populate('driver');

      if (status === 'approved' && doc.driver) {
        const driverUserId = doc.driver._id;
        const docs = await DriverDocument.find({ driver: driverUserId });
        const allApproved = docs.length >= 3 && docs.every(d => d.status === 'approved');
        if (allApproved) {
          await Driver.findOneAndUpdate({ user: driverUserId }, { documentsVerified: true });
        }
      } else if (status === 'rejected' && doc.driver) {
        await Driver.findOneAndUpdate({ user: doc.driver._id }, { documentsVerified: false });
      }

      return doc;
    },
  },
};

module.exports = resolvers;
