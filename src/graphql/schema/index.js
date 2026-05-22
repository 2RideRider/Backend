const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # ─── User Types ───────────────────────────────────────────────────────────────

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
    isOnline: Boolean
    vehicle: Vehicle
    createdAt: String
  }

  type CaptainUser {
    id: ID!
    name: String!
    email: String!
    phone: String!
    role: String!
    profileImage: String
    ratings: Float
    isVerified: Boolean
    isOnline: Boolean
    documentsVerified: Boolean
    vehicle: Vehicle
    license: License
    earnings: DriverEarnings
    createdAt: String
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type CaptainAuthPayload {
    token: String!
    refreshToken: String!
    captain: CaptainUser!
  }

  # ─── Location / Ride ──────────────────────────────────────────────────────────

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

  # ─── Driver / Captain ─────────────────────────────────────────────────────────

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

  # ─── Admin ────────────────────────────────────────────────────────────────────

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

  # ─── Input Types ──────────────────────────────────────────────────────────────

  input VehicleInput {
    type: String!
    model: String
    plateNumber: String!
    color: String
  }

  # ─── Queries ──────────────────────────────────────────────────────────────────

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

  # ─── Mutations ────────────────────────────────────────────────────────────────

  type Mutation {
    # Rider registration (role hardcoded to 'rider')
    registerRider(
      name: String!
      email: String!
      phone: String!
      password: String!
    ): AuthPayload

    # Captain registration (requires vehicle info)
    registerCaptain(
      name: String!
      email: String!
      phone: String!
      password: String!
      vehicle: VehicleInput!
    ): CaptainAuthPayload

    # Legacy register (kept for backward compatibility)
    register(
      name: String!
      email: String!
      phone: String!
      password: String!
      role: String!
      vehicleType: String
      vehicleModel: String
      plateNumber: String
      vehicleColor: String
    ): AuthPayload

    # Login works for both rider and captain
    login(email: String!, password: String!): AuthPayload

    # Ride mutations
    requestRide(
      pickupAddress: String!
      pickupCoords: [Float]!
      dropAddress: String!
      dropCoords: [Float]!
      vehicleType: String!
      fare: Float!
    ): Ride
    acceptRide(rideId: ID!): Ride
    updateRideStatus(rideId: ID!, status: String!, otp: String): Ride

    # Location / status
    updateLocation(lat: Float!, lng: Float!): User
    toggleOnline(isOnline: Boolean!): User

    # Documents
    uploadDocument(type: String!, documentUrl: String!): DriverDocument
    deleteDocument(type: String!): Boolean

    # Admin Mutations
    updateUserVerification(userId: ID!, isVerified: Boolean!): User
    updateDriverVerification(driverId: ID!, documentsVerified: Boolean!): Driver
    updateDocumentStatus(
      documentId: ID!
      status: String!
      rejectionReason: String
    ): DriverDocument
  }
`;

module.exports = typeDefs;
