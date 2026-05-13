const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: String!
    profileImage: String
    walletBalance: Float
    ratings: Float
    isVerified: Boolean
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type Location {
    address: String
    coordinates: [Float]
  }

  type Ride {
    id: ID!
    rider: User!
    driver: User
    pickupLocation: Location!
    dropLocation: Location!
    status: String!
    fare: Float!
    distance: Float
    vehicleType: String
    paymentMethod: String
    paymentStatus: String
    createdAt: String
  }

  type DriverStats {
    totalEarnings: Float
    todayEarnings: Float
    completedRides: Int
    rating: Float
  }

  type DriverDocument {
    id: ID!
    type: String!
    documentUrl: String!
    status: String!
  }

  type Query {
    me: User
    getRides: [Ride]
    getRide(id: ID!): Ride
    estimateFare(pickup: [Float]!, drop: [Float]!, vehicleType: String!): Float
    getDriverStats: DriverStats
    getDriverDocuments: [DriverDocument]
    getAvailableRides: [Ride]
  }

  type Mutation {
    register(name: String!, email: String!, phone: String!, password: String!, role: String!): AuthPayload
    login(email: String!, password: String!): AuthPayload
    requestRide(pickupAddress: String!, pickupCoords: [Float]!, dropAddress: String!, dropCoords: [Float]!, vehicleType: String!, fare: Float!): Ride
    acceptRide(rideId: ID!): Ride
    updateLocation(lat: Float!, lng: Float!): User
    toggleOnline(isOnline: Boolean!): User
    uploadDocument(type: String!, documentUrl: String!): DriverDocument
    updateRideStatus(rideId: ID!, status: String!, otp: String): Ride
  }
`;

module.exports = typeDefs;
