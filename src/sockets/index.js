const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('updateLocation', (data) => {
      // data: { userId, lat, lng, role }
      // Broadcast to relevant users (e.g., if driver, broadcast to rider)
      socket.broadcast.emit('locationUpdated', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

module.exports = { setupSocket };
