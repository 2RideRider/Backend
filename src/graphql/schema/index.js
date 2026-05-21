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
    createdAt: String
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

  type Vehicle {
    type: String!
    model: String
    plateNumber: String!
    color: String
  }

  type License {
    number: String
    expiryDate: String
    image: String
  }

  type DriverEarnings {
    total: Float
    today: Float
  }

  type Driver {
    id: ID!
    user: User!
    vehicle: Vehicle!
    license: License
    isOnline: Boolean
    currentRide: Ride
    earnings: DriverEarnings
    documentsVerified: Boolean
    createdAt: String
  }

  type DriverDocument {
    id: ID!
    driver: User!
    type: String!
    documentUrl: String!
    status: String!
    expiryDate: String
    rejectionReason: String
    createdAt: String
  }

  type AdminStats {
    totalRiders: Int!
    totalDrivers: Int!
    totalRides: Int!
    totalEarnings: Float!
    activeRides: Int!
    pendingDrivers: Int!
  }

  type ConfigStatus {
    key: String!
    configured: Boolean!
    value: String
  }

  type SystemConfig {
    port: Int!
    dbHost: String!
    services: [ConfigStatus!]!
  }

  type Query {
    me: User
    getRides: [Ride]
    getRide(id: ID!): Ride
    estimateFare(pickup: [Float]!, drop: [Float]!, vehicleType: String!): Float
    getDriverStats: DriverStats
    getDriverDocuments: [DriverDocument]
    getAvailableRides: [Ride]

    # Admin Queries
    getAllUsers: [User]
    getAllDrivers: [Driver]
    getAdminStats: AdminStats
    getAllDriverDocuments: [DriverDocument]
    getSystemConfig: SystemConfig
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

    # Admin Mutations
    updateUserVerification(userId: ID!, isVerified: Boolean!): User
    updateDriverVerification(driverId: ID!, documentsVerified: Boolean!): Driver
    updateDocumentStatus(documentId: ID!, status: String!, rejectionReason: String): DriverDocument
  }
`;

module.exports = typeDefs;
