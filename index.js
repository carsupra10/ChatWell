const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const httpserver = http.Server(app);
const io = socketio(httpserver);

const gamedirectory = path.join(__dirname, "html");

app.use(express.static(gamedirectory));

httpserver.listen(3000);

// Data structure to store waiting users
let waitingUsers = [];

io.on('connection', function(socket){

  socket.on("join", function(username){
    if (username !== ""){
      // Add the user to the list of waiting users
      waitingUsers.push({ socket: socket, username: username });
      
      // Try to pair with another user if available
      tryPairingUsers();
    }
  });

  socket.on("send", function(data){
    const roomId = Object.keys(socket.rooms)[1]; // Get the room ID
    io.to(roomId).emit("receive", data);
  });

  socket.on("disconnect", function(){
    // Remove the user from the waiting list if they disconnect
    const index = waitingUsers.findIndex(user => user.socket === socket);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
  });

  socket.on("disconnect-room", function() {
    const roomId = Object.keys(socket.rooms)[1]; // Get the room ID
    io.to(roomId).emit("chat-close"); // Notify the other user to close chat
    io.to(roomId).emit("disconnect"); // Disconnect both users
  });
  
  socket.on("refresh-page", function() {
    const roomId = Object.keys(socket.rooms)[1]; // Get the room ID
    io.to(roomId).emit("refresh-page"); // Notify the other user to refresh the page
  });
  

  function tryPairingUsers() {
    if (waitingUsers.length >= 2) {
      const user1 = waitingUsers.shift(); // Get the first waiting user
      const user2 = waitingUsers.shift(); // Get the second waiting user

      const roomId = user1.socket.id + '_' + user2.socket.id; // Generate a unique room ID

      user1.socket.join(roomId);
      user2.socket.join(roomId);

      // Notify users that they are now connected
      user1.socket.emit("receive", { message: "Server: You are now connected with a partner.", username: "Server" });
      user2.socket.emit("receive", { message: "Server: You are now connected with a partner.", username: "Server" });
    }
  }
});
