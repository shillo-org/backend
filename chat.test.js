#!/usr/bin/env node
const { io } = require("socket.io-client");
const readline = require("readline");

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configure the client
let currentStream = null;
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

console.log("\n=== Socket.IO Chat CLI Client ===");
console.log("----------------------------------");

// Prompt for stream ID
rl.question("Enter stream ID to join: ", (streamId) => {
  if (!streamId.trim()) {
    console.log("Stream ID cannot be empty");
    rl.close();
    process.exit(1);
  }
  
  currentStream = streamId.trim();
  startChat(currentStream);
});

function startChat(streamId) {
  console.log(`\nConnecting to ${SERVER_URL}...`);
  
  // Connect to Socket.IO server
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: true
  });
  
  // Handle connection
  socket.on("connect", () => {
    console.log(`Connected to server with ID: ${socket.id}`);
    console.log("----------------------------------");
    
    // Join the stream
    joinStream(streamId);
    
    // Show command help
    showHelp();
    
    // Prompt for input
    promptForInput();
  });
  
  socket.on("connect_error", (error) => {
    console.log(`Connection error: ${error.message}`);
  });
  
  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });
  
  // Handle chat events
  socket.on("streamHistory", (data) => {
    console.log(`\nMessage history for stream "${data.streamId}" (${data.messages.length} messages):`);
    
    if (data.messages.length === 0) {
      console.log("  No previous messages");
    } else {
      data.messages.forEach((msg) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`  [${time}] ${msg.username}: ${msg.message}`);
      });
    }
    
    console.log("----------------------------------");
  });
  
  socket.on("newMessage", (data) => {
    const time = new Date(data.message.timestamp).toLocaleTimeString();
    console.log(`\n[${time}] ${data.message.username}: ${data.message.message}`);
    promptForInput();
  });
  
  // Command functions
  function joinStream(streamId) {
    console.log(`\nJoining stream "${streamId}"...`);
    
    socket.emit("subscribeToStream", streamId, (response) => {
      if (response && response.success) {
        currentStream = streamId;
        console.log(`Joined stream: ${streamId}`);
      } else {
        console.log(`Failed to join stream: ${streamId}`);
      }
    });
  }
  
  function sendMessage(message) {
    const messageData = {
      streamId: currentStream,
      message: {
        username: process.env.USERNAME || "cli_user",
        profile_pic: "https://example.com/cli_avatar.png",
        message: message
      }
    };
    
    socket.emit("sendMessage", messageData);
  }
  
  function showHelp() {
    console.log("\nAvailable commands:");
    console.log("  /join streamId - Join a different stream");
    console.log("  /help - Show this help message");
    console.log("  /exit - Exit the chat client");
    console.log("  Type anything else to send a message");
    console.log("----------------------------------");
  }
  
  // Handle user input
  function promptForInput() {
    rl.question(`${currentStream}> `, (input) => {
      if (input.startsWith("/join ")) {
        const newStream = input.substring(6).trim();
        if (newStream) {
          joinStream(newStream);
        } else {
          console.log("Stream ID cannot be empty");
        }
        promptForInput();
      } else if (input === "/help") {
        showHelp();
        promptForInput();
      } else if (input === "/exit") {
        console.log("\nDisconnecting...");
        socket.disconnect();
        rl.close();
        process.exit(0);
      } else if (input.trim()) {
        sendMessage(input);
        // Don't prompt again - wait for message echo
      } else {
        promptForInput();
      }
    });
  }
  
  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\nDisconnecting...");
    socket.disconnect();
    rl.close();
    process.exit(0);
  });
}