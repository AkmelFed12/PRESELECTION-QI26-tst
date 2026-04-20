// ============= WEBSOCKET CLIENT FOR REAL-TIME CHAT =============

class ChatWebSocket {
  constructor(groupId, userId, authToken) {
    this.groupId = groupId;
    this.userId = userId;
    this.authToken = authToken;
    this.ws = null;
    this.handlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;

        // Send join message
        this.send({
          type: 'join',
          groupId: this.groupId,
          userId: this.userId,
          auth: this.authToken
        });

        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect();
      };
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  sendMessage(content) {
    this.send({
      type: 'message',
      groupId: this.groupId,
      userId: this.userId,
      content
    });
  }

  sendTyping(isTyping) {
    this.send({
      type: 'typing',
      groupId: this.groupId,
      userId: this.userId,
      isTyping
    });
  }

  sendReaction(messageId, emoji) {
    this.send({
      type: 'reaction',
      groupId: this.groupId,
      messageId,
      emoji
    });
  }

  handleMessage(data) {
    const { type } = data;

    if (type === 'message') {
      this.emit('message', data);
    } else if (type === 'typing') {
      this.emit('typing', data);
    } else if (type === 'reaction') {
      this.emit('reaction', data);
    } else if (type === 'user_joined') {
      this.emit('user_joined', data);
    } else if (type === 'user_left') {
      this.emit('user_left', data);
    } else if (type === 'error') {
      this.emit('error', data);
    }
  }

  on(event, callback) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(callback);
  }

  off(event, callback) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(cb => cb(data));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch(e => console.error('Reconnect failed:', e));
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('disconnected', { error: 'Connection lost' });
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============= USAGE EXAMPLE =============
/*
const chatWS = new ChatWebSocket(
  groupId,           // Chat group ID
  currentUser.id,    // Current user ID
  localStorage.getItem('memberAuth') // Auth token
);

// Connect
await chatWS.connect();

// Listen for messages
chatWS.on('message', (msg) => {
  console.log('New message:', msg);
  // Add to chat UI
});

// Listen for typing
chatWS.on('typing', (data) => {
  if (data.isTyping) {
    console.log(`${data.userId} is typing...`);
  }
});

// Send message
chatWS.sendMessage('Hello everyone!');

// Send typing indicator
chatWS.sendTyping(true);
setTimeout(() => chatWS.sendTyping(false), 1000);

// Send reaction
chatWS.sendReaction(messageId, '👍');
*/
