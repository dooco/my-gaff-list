# WebSocket Testing Guide

## Test Accounts
You'll need at least 2 test accounts to properly test real-time features.

## Step 1: Basic Connection Test
1. Open http://localhost:3001 in Chrome
2. Open DevTools (F12) and go to Console tab
3. Log in with your first test account
4. Navigate to Messages
5. Check for these console logs:
   - "Auth token available, WebSocket can connect"
   - "WebSocket: Connecting with token: ..."
   - "WebSocket connected"
6. Look for green "Live" indicator in the UI

## Step 2: Real-Time Messages
1. Keep first browser window open
2. Open new Incognito window
3. Log in with second test account
4. Navigate to same conversation
5. Send message from Window 1
6. Verify it appears instantly in Window 2

## Step 3: Typing Indicators
1. In Window 1, start typing (don't press Enter)
2. Window 2 should show "[User] is typing..."
3. Stop typing and wait 3 seconds
4. Typing indicator should disappear

## Step 4: Network Resilience
1. Open Network tab in DevTools
2. Look for WebSocket connection (WS filter)
3. Set network to "Offline"
4. "Live" indicator should disappear
5. Type a message and try to send
6. Set network back to "Online"
7. WebSocket should reconnect automatically
8. Message should send

## Console Commands for Testing

Check authentication token:
```javascript
localStorage.getItem('access_token')
```

Check WebSocket connection:
```javascript
webSocketService.isConnected()
```

Send test message via WebSocket:
```javascript
import('/src/services/websocket.js').then(m => {
  m.webSocketService.sendMessage('CONVERSATION_ID', 'Test message from console')
})
```

## Expected Behavior
- Messages appear within 100ms
- Typing indicators show/hide smoothly
- Connection recovers from network issues
- No errors in console during normal use