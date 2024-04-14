var socket;
var usernameInput;
var chatRoom;
var dingSound;
var messages = [];
var delay = true;
var isConnected = false;

function onload(){
  socket = io();
  usernameInput = document.getElementById("NameInput");
  chatRoom = document.getElementById("RoomID");
  dingSound = document.getElementById("Ding");

  // Retrieve username from local storage
  const savedUsername = localStorage.getItem("username");
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  // Add event listener for the Stop button
  document.getElementById("StopButton").addEventListener("click", function() {
    Stop();
  });

  // Add event listener for the Enter key
  document.getElementById("ComposedMessage").addEventListener("keypress", function(event) {
    if (event.keyCode === 13) { // Check if Enter key is pressed
      Send(); // Call the Send function
    }
  });

  socket.on("receive", function(data){
    console.log(data);
    var message = data.message;
    var sender = data.username;
    if (messages.length < 9){
      messages.push({ message: message, sender: sender });
      dingSound.currentTime = 0;
      dingSound.play();
    }
    else{
      messages.shift();
      messages.push({ message: message, sender: sender });
    }
    displayMessages();
  });

  socket.on("chat-close", function() {
    clearChat();
    isConnected = false; // Update connection status
  });

  socket.on("disconnect", function() {
    clearChat();
    isConnected = false; // Update connection status
  });
}

function Connect(){
  if (usernameInput.value === "") {
    alert("Please enter a username.");
    return;
  }

  socket.emit("join", usernameInput.value);
  isConnected = true; // Update connection status
}

function Stop() {
  if (isConnected) {
    socket.emit("disconnect-room"); // Emit signal to disconnect both users
    clearChat();
    isConnected = false; // Update connection status
    socket.emit("refresh-page"); // Emit signal to refresh the other user's page
  }
  
  // Save username in local storage
  localStorage.setItem("username", usernameInput.value);
  
  // Refresh the page
  location.reload();
}

function Send(){
  var messageInput = document.getElementById("ComposedMessage");
  if (delay && messageInput.value.replace(/\s/g, "") !== ""){
    delay = false;
    setTimeout(delayReset, 1000);
    socket.emit("send", { message: messageInput.value, username: usernameInput.value });
    messageInput.value = "";
  }
}

function delayReset(){
  delay = true;
}

function displayMessages() {
  var chatContainer = document.getElementById("Chat");
  chatContainer.innerHTML = "";

  messages.forEach(function(msg) {
    var messageElement = document.createElement("p");
    messageElement.textContent = msg.sender + ": " + msg.message;
    chatContainer.appendChild(messageElement);
  });

  // Automatically scroll to the bottom of the chat container
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearChat() {
  messages = [];
  displayMessages();
}
