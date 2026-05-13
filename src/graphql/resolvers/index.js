const User = require('../../models/User');
const Ride = require('../../models/Ride');
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
      return await Ride.find({ $or: [{ rider: user.id }, { driver: user.id }] }).populate('rider driver');
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
    getAvailableRides: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Ride.find({ status: 'requested' }).populate('rider');
    },
  },
  Mutation: {
    register: async (_, { name, email, phone, password, role }) => {
      const userExists = await User.findOne({ $or: [{ email }, { phone }] });
      if (userExists) throw new Error('User already exists');

      const user = await User.create({ name, email, phone, password, role });

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
  },
};

module.exports = resolvers;
