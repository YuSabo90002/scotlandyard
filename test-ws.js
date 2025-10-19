const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ WebSocket connection successful!');
  console.log('Sending CREATE_ROOM message...');
  ws.send(JSON.stringify({
    type: 'CREATE_ROOM',
    playerName: 'TestPlayer',
    isPrivate: false
  }));
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString());
  ws.close();
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏱️  Timeout - connection failed');
  process.exit(1);
}, 5000);
