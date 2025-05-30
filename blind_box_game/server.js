import { serve } from "bun";
import { Server as WebSocketServer } from "ws";

// Game state
const gameState = {
  players: {},
  gameRooms: {},
};

// Create WebSocket server
const wss = new WebSocketServer({ port: 3000 });

console.log("WebSocket server running on ws://localhost:3000");

wss.on("connection", (ws) => {
  console.log("New client connected");
  const playerId = Math.random().toString(36).substring(2, 15);
  
  // Initialize player
  gameState.players[playerId] = {
    id: playerId,
    name: `Player ${Object.keys(gameState.players).length + 1}`,
    balance: 2000,
    roomId: null,
  };
  
  // Send initial player data
  ws.send(JSON.stringify({
    type: "CONNECTION_ESTABLISHED",
    playerId: playerId,
    playerData: gameState.players[playerId],
  }));

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("Received:", data);
    
    switch(data.type) {
      case "SET_NAME":
        gameState.players[playerId].name = data.name;
        broadcastPlayerUpdate(playerId);
        break;
        
      case "CREATE_ROOM":
        createRoom(playerId, data.roomName);
        break;
        
      case "JOIN_ROOM":
        joinRoom(playerId, data.roomId);
        break;
        
      case "LEAVE_ROOM":
        if (gameState.players[playerId]?.roomId) {
          leaveRoom(playerId, data.roomId);
        }
        break;
        
      case "FLIP_CARD":
        handleCardFlip(playerId, data.cardNumber);
        break;
        
      case "RESTART_GAME":
        restartGame(data.roomId);
        break;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    const roomId = gameState.players[playerId]?.roomId;
    if (roomId) {
      leaveRoom(playerId, roomId);
    }
    delete gameState.players[playerId];
  });

  // Store the WebSocket connection with the player ID
  ws.playerId = playerId;
  
  // Broadcast available rooms
  sendAvailableRooms(ws);
});

// Helper functions for game management
function createRoom(playerId, roomName) {
  const roomId = Math.random().toString(36).substring(2, 10);
  
  // Generate prize positions
  const prizeCards = [];
  while (prizeCards.length < 2) {
    const num = Math.floor(Math.random() * 20) + 1;
    if (!prizeCards.includes(num)) {
      prizeCards.push(num);
    }
  }
  
  // Generate hint digits
  const hintDigits = generateHintDigits(prizeCards);
  
  gameState.gameRooms[roomId] = {
    id: roomId,
    name: roomName || `Room ${Object.keys(gameState.gameRooms).length + 1}`,
    players: [playerId],
    prizeCards: prizeCards,
    hintDigits: hintDigits,
    flippedCards: {},
    currentTurn: playerId,
    creator: playerId,
  };
  
  // Update player's room
  gameState.players[playerId].roomId = roomId;
  
  // Send room info to the player
  sendToPlayer(playerId, {
    type: "ROOM_CREATED",
    room: getRoomData(roomId),
  });
  
  // Broadcast updated room list
  broadcastRooms();
}

function joinRoom(playerId, roomId) {
  if (!gameState.gameRooms[roomId]) {
    sendToPlayer(playerId, { type: "ERROR", message: "Room not found" });
    return;
  }
  
  // Check if player is already in the room
  if (gameState.gameRooms[roomId].players.includes(playerId)) {
    // Player is already in this room, just update their view
    sendToPlayer(playerId, {
      type: "ROOM_JOINED",
      room: getRoomData(roomId),
    });
    return;
  }
  
  // Add player to room
  gameState.gameRooms[roomId].players.push(playerId);
  gameState.players[playerId].roomId = roomId;
  
  // Send room info to the player
  sendToPlayer(playerId, {
    type: "ROOM_JOINED",
    room: getRoomData(roomId),
  });
  
  // Notify other players in room
  broadcastToRoom(roomId, {
    type: "PLAYER_JOINED",
    player: getPlayerData(playerId),
    roomData: getRoomData(roomId),
  });
}

function leaveRoom(playerId, roomId) {
  if (!gameState.gameRooms[roomId]) return;
  
  // Remove player from room
  gameState.gameRooms[roomId].players = 
    gameState.gameRooms[roomId].players.filter(id => id !== playerId);
  
  // Update player
  if (gameState.players[playerId]) {
    gameState.players[playerId].roomId = null;
  }
  
  // If room is empty, delete it
  if (gameState.gameRooms[roomId].players.length === 0) {
    delete gameState.gameRooms[roomId];
    broadcastRooms();
    return;
  }
  
  // If creator left, assign a new creator
  if (gameState.gameRooms[roomId].creator === playerId) {
    gameState.gameRooms[roomId].creator = gameState.gameRooms[roomId].players[0];
  }
  
  // If it was this player's turn, move to next player
  if (gameState.gameRooms[roomId].currentTurn === playerId) {
    const nextPlayerIndex = 0; // Just select the first player
    gameState.gameRooms[roomId].currentTurn = 
      gameState.gameRooms[roomId].players[nextPlayerIndex];
  }
  
  // Notify remaining players
  broadcastToRoom(roomId, {
    type: "PLAYER_LEFT",
    playerId: playerId,
    roomData: getRoomData(roomId),
  });
}

function handleCardFlip(playerId, cardNumber) {
  const roomId = gameState.players[playerId]?.roomId;
  
  if (!roomId || !gameState.gameRooms[roomId]) {
    sendToPlayer(playerId, { type: "ERROR", message: "You're not in a room" });
    return;
  }
  
  const room = gameState.gameRooms[roomId];
  
  // Check if card is already flipped
  if (room.flippedCards[cardNumber]) {
    sendToPlayer(playerId, { type: "ERROR", message: "Card already flipped" });
    return;
  }
  
  // Get player data
  const player = gameState.players[playerId];
  const currentCost = 19; // Fixed cost for now
  
  // Check if player has enough balance
  if (player.balance < currentCost) {
    sendToPlayer(playerId, { type: "ERROR", message: "Insufficient balance" });
    return;
  }
  
  // Deduct balance
  player.balance -= currentCost;
  
  // Record card flip and determine prize
  const isPrize = room.prizeCards.includes(cardNumber);
  const reward = isPrize ? 100 : 1; // 100 for big prize, 1 for small prize
  
  // Add reward to player's balance
  player.balance += reward;
  
  room.flippedCards[cardNumber] = {
    flippedBy: playerId,
    isPrize: isPrize,
    reward: reward
  };
  
  // Count prizes found by this player
  const playerPrizes = Object.entries(room.flippedCards)
    .filter(([_, data]) => data.flippedBy === playerId && data.isPrize)
    .length;
  
  // Notify all players in room
  broadcastToRoom(roomId, {
    type: "CARD_FLIPPED",
    cardNumber: cardNumber,
    player: getPlayerData(playerId),
    isPrize: isPrize,
    reward: reward,
    roomData: getRoomData(roomId),
  });
  
  // Check if all prizes found
  const totalPrizesFound = Object.values(room.flippedCards)
    .filter(data => data.isPrize).length;
    
  if (totalPrizesFound >= room.prizeCards.length) {
    // Game over - all prizes found
    broadcastToRoom(roomId, {
      type: "GAME_OVER",
      winners: getWinners(roomId),
      roomData: getRoomData(roomId),
    });
  }
}

function restartGame(roomId) {
  if (!gameState.gameRooms[roomId]) return;
  
  // Generate new prize cards
  const prizeCards = [];
  while (prizeCards.length < 2) {
    const num = Math.floor(Math.random() * 20) + 1;
    if (!prizeCards.includes(num)) {
      prizeCards.push(num);
    }
  }
  
  // Reset room game state
  gameState.gameRooms[roomId].prizeCards = prizeCards;
  gameState.gameRooms[roomId].hintDigits = generateHintDigits(prizeCards);
  gameState.gameRooms[roomId].flippedCards = {};
  
  // Reset to creator's turn
  gameState.gameRooms[roomId].currentTurn = gameState.gameRooms[roomId].creator;
  
  // Notify all players
  broadcastToRoom(roomId, {
    type: "GAME_RESTARTED",
    roomData: getRoomData(roomId),
  });
}

// Helper utilities
function generateHintDigits(prizeCards) {
  const possibleDigits = new Set();
  
  // Add all prize card last digits
  for (const prize of prizeCards) {
    possibleDigits.add(prize % 10);
  }
  
  // Fill with random digits up to 6
  while (possibleDigits.size < 6) {
    const randomDigit = Math.floor(Math.random() * 10);
    possibleDigits.add(randomDigit);
  }
  
  // Sort and return
  return Array.from(possibleDigits).sort((a, b) => a - b);
}

function getWinners(roomId) {
  const room = gameState.gameRooms[roomId];
  
  // Count prizes found by each player
  const playerPrizes = {};
  room.players.forEach(playerId => {
    playerPrizes[playerId] = 0;
  });
  
  // Count flipped prizes by player
  Object.values(room.flippedCards).forEach(flip => {
    if (flip.isPrize) {
      playerPrizes[flip.flippedBy]++;
    }
  });
  
  // Find max prizes found
  const maxPrizes = Math.max(...Object.values(playerPrizes));
  
  // Return all players with max prizes
  return Object.entries(playerPrizes)
    .filter(([_, count]) => count === maxPrizes)
    .map(([playerId, _]) => getPlayerData(playerId));
}

function getRoomData(roomId) {
  const room = gameState.gameRooms[roomId];
  if (!room) return null;
  
  return {
    id: room.id,
    name: room.name,
    players: room.players.map(id => getPlayerData(id)),
    flippedCards: room.flippedCards,
    currentTurn: room.currentTurn,
    creator: room.creator,
    // Don't send prize positions to clients to prevent cheating!
    hintDigits: room.hintDigits,
  };
}

function getPlayerData(playerId) {
  const player = gameState.players[playerId];
  if (!player) return null;
  
  return {
    id: player.id,
    name: player.name,
    balance: player.balance,
  };
}

function sendToPlayer(playerId, data) {
  Array.from(wss.clients)
    .filter(client => client.playerId === playerId)
    .forEach(client => {
      client.send(JSON.stringify(data));
    });
}

function broadcastToRoom(roomId, data) {
  if (!gameState.gameRooms[roomId]) return;
  
  const playerIds = gameState.gameRooms[roomId].players;
  
  Array.from(wss.clients)
    .filter(client => playerIds.includes(client.playerId))
    .forEach(client => {
      client.send(JSON.stringify(data));
    });
}

function broadcastPlayerUpdate(playerId) {
  const playerData = getPlayerData(playerId);
  const roomId = gameState.players[playerId]?.roomId;
  
  if (roomId) {
    broadcastToRoom(roomId, {
      type: "PLAYER_UPDATED",
      player: playerData,
    });
  }
}

function broadcastRooms() {
  const roomList = Object.values(gameState.gameRooms).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.length,
  }));
  
  Array.from(wss.clients).forEach(client => {
    client.send(JSON.stringify({
      type: "ROOMS_LIST",
      rooms: roomList,
    }));
  });
}

function sendAvailableRooms(ws) {
  const roomList = Object.values(gameState.gameRooms).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.length,
  }));
  
  ws.send(JSON.stringify({
    type: "ROOMS_LIST",
    rooms: roomList,
  }));
}

// HTTP server for serving static files
serve({
  fetch(req) {
    // Simple static file server to serve our game files
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Default to index.html
    if (path === "/") {
      path = "/index.html";
    }
    
    // Try to serve the file
    try {
      const file = Bun.file("./public" + path);
      return new Response(file);
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }
  },
  port: 8080,
});

console.log("HTTP server running on http://localhost:8080");