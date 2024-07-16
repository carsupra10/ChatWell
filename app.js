const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const waitingList = [];
const chatSessions = {};
const connectedUsers = new Set();

const SOCKET_TIMEOUT = 60000; // 60 seconds

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  const logActiveUsers = () => {
    console.log(`Active users: ${connectedUsers.size}`);
  };

  console.log(`User connected: ${socket.id}`);
  connectedUsers.add(socket.id);
  logActiveUsers();

  let timeout;

  const resetTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      socket.emit('timeout');
      disconnectUser(socket.id);
    }, SOCKET_TIMEOUT);
  };

  const disconnectUser = (userId) => {
    console.log(`User disconnected due to timeout: ${userId}`);
    const partnerId = chatSessions[userId];

    if (partnerId) {
      io.to(partnerId).emit('partnerDisconnected');
      delete chatSessions[partnerId];
    }

    delete chatSessions[userId];
    const waitingIndex = waitingList.indexOf(userId);
    if (waitingIndex > -1) {
      waitingList.splice(waitingIndex, 1);
    }
    connectedUsers.delete(userId);
    logActiveUsers();
    socket.disconnect();
  };

  socket.on('find', () => {
    resetTimeout();
    console.log(`User ${socket.id} is searching for a chat partner`);
    if (chatSessions[socket.id]) {
      socket.emit('message', 'You are already in a chat. Use the "End" button to leave the chat.');
    } else if (waitingList.includes(socket.id)) {
      socket.emit('message', 'You are already in the waiting list. Please wait for a partner to be assigned.');
    } else {
      waitingList.push(socket.id);
      tryMatchPartners();
      io.to(socket.id).emit('message', 'You are added in the waiting list.');
    }
  });

  socket.on('end', () => {
    resetTimeout();
    const partnerId = chatSessions[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('message', 'Chat ended by your partner.');
      delete chatSessions[partnerId];
    }
    delete chatSessions[socket.id];
    socket.emit('message', 'Chat ended.');
    tryMatchPartners();
  });

  socket.on('next', () => {
    resetTimeout();
    const partnerId = chatSessions[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('message', 'Chat ended by your partner.');
      delete chatSessions[partnerId];
    }
    delete chatSessions[socket.id];
    waitingList.push(socket.id);
    tryMatchPartners();
  });

  socket.on('message', (message) => {
    resetTimeout();
    const partnerId = chatSessions[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('message', message);
    } else {
      socket.emit('message', 'You don\'t have an ongoing chat. Use the "Find" button to search for a partner to chat with.');
    }
  });

  socket.on('disconnect', () => {
    disconnectUser(socket.id);
  });

  const tryMatchPartners = () => {
    while (waitingList.length >= 2) {
      const userId1 = waitingList.shift();
      const userId2 = waitingList.shift();
      chatSessions[userId1] = userId2;
      chatSessions[userId2] = userId1;
      io.to(userId1).emit('message', 'Partner found! Start chatting.');
      io.to(userId2).emit('message', 'Partner found! Start chatting.');
    }
  };
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
