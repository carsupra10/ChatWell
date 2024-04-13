// script.js
var socket;
var usernameInput;
var chatRoom;
var dingSound;
var messages = [];
var delay = true;
var myUsername;

function onload(){
  socket = io();
  usernameInput = document.getElementById("NameInput");
  chatRoom = document.getElementById("RoomID");
  dingSound = document.getElementById("Ding");

  // Add event listener for the "Enter" key
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
}

function Connect(){
  if (usernameInput.value === "") {
    alert("Please enter a username.");
    return;
  }

  myUsername = usernameInput.value;
  socket.emit("join", myUsername);
}

function Send(){
  var messageInput = document.getElementById("ComposedMessage");
  if (delay && messageInput.value.replace(/\s/g, "") !== ""){
    delay = false;
    setTimeout(delayReset, 1000);
    socket.emit("send", { message: messageInput.value, username: myUsername });
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
