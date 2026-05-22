const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const { authMiddleware } = require('./middleware/auth');

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Trust the first proxy hop (required on Render/Heroku/Railway etc.)
  // so express-rate-limit can read X-Forwarded-For correctly
  app.set('trust proxy', 1);

  // Socket.io setup
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Attach io to request object
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Middlewares
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: (process.env.NODE_ENV === 'production' ? undefined : false) }));
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use('/graphql', limiter);

  // Apollo Server setup
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Get user from middleware
      const user = authMiddleware(req);
      return { req, user, io };
    },
    introspection: true,
    playground: true,
  });

  await server.start();
  server.applyMiddleware({ app });

  // Socket.io logic
  const { setupSocket } = require('./sockets');
  setupSocket(io);

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Sockets ready`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
