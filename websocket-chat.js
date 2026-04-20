// ============= WEBSOCKET SERVER SETUP =============
// Add to server.js after all other requires

const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Upgrade HTTP to WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  
  if (pathname === '/ws/chat') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ============= CHAT ROOM MANAGEMENT =============
const chatRooms = new Map(); // { groupId: Set<WebSocket> }
const userSessions = new Map(); // { userId: { groupId, ws } }

wss.on('connection', (ws, request) => {
  let userId = null;
  let groupId = null;

  // Message handler
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      
      // First message: authenticate and join
      if (msg.type === 'join') {
        userId = msg.userId;
        groupId = msg.groupId;
        const auth = msg.auth;

        // Verify auth token
        const decoded = jwt.verify(auth, process.env.JWT_SECRET || 'secret');
        if (decoded.id !== userId) {
          ws.close(1008, 'Invalid auth');
          return;
        }

        // Add user to room
        if (!chatRooms.has(groupId)) {
          chatRooms.set(groupId, new Set());
        }
        chatRooms.get(groupId).add(ws);
        userSessions.set(userId, { groupId, ws });

        // Broadcast user joined
        broadcastToRoom(groupId, {
          type: 'user_joined',
          userId,
          timestamp: new Date().toISOString()
        }, ws);

        console.log(`User ${userId} joined group ${groupId}`);
      }

      // Typing indicator
      else if (msg.type === 'typing') {
        broadcastToRoom(groupId, {
          type: 'typing',
          userId,
          isTyping: msg.isTyping,
          timestamp: new Date().toISOString()
        }, ws);
      }

      // New message
      else if (msg.type === 'message') {
        const content = msg.content?.trim();
        if (!content || content.length > 2000) {
          ws.send(JSON.stringify({ error: 'Invalid message' }));
          return;
        }

        // Save to database
        const result = await pool.query(
          `INSERT INTO chat_messages (group_id, author_id, content, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, created_at`,
          [groupId, userId, content]
        );

        const messageId = result.rows[0].id;
        const timestamp = result.rows[0].created_at;

        // Broadcast to all in room
        broadcastToRoom(groupId, {
          type: 'message',
          messageId,
          userId,
          content,
          timestamp
        }, null);
      }

      // Emoji reaction
      else if (msg.type === 'reaction') {
        const { messageId, emoji } = msg;
        
        // Save reaction
        await pool.query(
          `INSERT INTO message_reactions (message_id, user_id, emoji)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [messageId, userId, emoji]
        );

        // Broadcast reaction
        broadcastToRoom(groupId, {
          type: 'reaction',
          messageId,
          userId,
          emoji,
          timestamp: new Date().toISOString()
        }, null);
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
      ws.send(JSON.stringify({ error: 'Processing error' }));
    }
  });

  // Disconnect handler
  ws.on('close', () => {
    if (groupId && userId) {
      // Remove from room
      const room = chatRooms.get(groupId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          chatRooms.delete(groupId);
        }
      }

      // Remove session
      userSessions.delete(userId);

      // Broadcast user left
      broadcastToRoom(groupId, {
        type: 'user_left',
        userId,
        timestamp: new Date().toISOString()
      }, null);

      console.log(`User ${userId} left group ${groupId}`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// ============= BROADCAST UTILITY =============
function broadcastToRoom(groupId, message, excludeWs = null) {
  const room = chatRooms.get(groupId);
  if (!room) return;

  const payload = JSON.stringify(message);
  room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(payload);
    }
  });
}

// Export for use
module.exports = { wss, chatRooms, broadcastToRoom };
