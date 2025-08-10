# Testing WebSocket Implementation in Live Application

## Quick Test Guide

### 1. Access the Application
- Open your browser to: http://localhost:3000
- Login with either:
  - **Renter**: padraigdooley@gmail.com
  - **Landlord**: jim@fixit.ie

### 2. Navigate to Messages
- Click on "Messages" in the navigation
- You should see existing conversations
- Click on the conversation between Padraig and Jim

### 3. Test Real-Time Features

#### ✅ Fixed Bottom Input Bar
- The input area should be fixed at the bottom of the screen
- Messages should appear above the input area
- The conversation should scroll up as new messages arrive

#### ✅ Real-Time Messaging
1. Open two browser windows/tabs
2. Login as Padraig in one, Jim in the other
3. Navigate to the same conversation in both
4. Send a message from one user
5. **Expected**: Message appears instantly in both windows

#### ✅ Typing Indicators
1. Start typing in one window (don't send)
2. **Expected**: Other window shows "typing..." under the user's name
3. Stop typing and wait 2 seconds
4. **Expected**: Typing indicator disappears

#### ✅ Read Receipts
1. Send a message from one user
2. **Expected**: Single checkmark appears
3. Other user views the message
4. **Expected**: Double checkmarks appear

#### ✅ Connection Status
- Look at the header area
- Should show "Online" with green WiFi icon when connected
- If disconnected, shows "Connecting..." or "Offline"

#### ✅ Auto-Reconnection
1. Stop the backend server (Ctrl+C in terminal)
2. **Expected**: UI shows "Connecting..."
3. Restart backend: `npm run backend:dev`
4. **Expected**: Automatically reconnects within seconds

### 4. UI Features to Verify

- **Smooth Scrolling**: New messages smoothly scroll into view
- **Message Alignment**: Your messages on right (blue), other user's on left (white)
- **Time Stamps**: Shows relative time (e.g., "2 minutes ago")
- **Avatar Initials**: Shows first letter of user's name in colored circle
- **Responsive Input**: Textarea expands as you type (up to 3 lines)
- **Send Button**: Blue when text entered, gray when empty

### 5. Monitoring WebSocket Activity

Open browser DevTools (F12) and check:
- **Network Tab**: Look for WebSocket connection (ws://localhost:8000/ws/messages/)
- **Console**: Should show WebSocket connection logs
- **Network → WS → Messages**: See real-time message frames

### Common Issues & Solutions

#### Connection Failed
- Ensure backend is running: `npm run backend:dev`
- Check tokens haven't expired (regenerate if needed)
- Verify CORS settings are correct

#### Messages Not Sending
- Check WebSocket connection status in UI
- Verify you're in the correct conversation
- Check browser console for errors

#### Typing Indicators Not Working
- Ensure both users are in the same conversation
- Check WebSocket frames in DevTools

## Success Criteria
✅ Messages deliver instantly between users
✅ Input bar stays fixed at bottom
✅ Messages scroll up from bottom
✅ Typing indicators work bidirectionally
✅ Read receipts update correctly
✅ Connection status shows accurately
✅ Auto-reconnection works when connection drops

## Backend Logs
Monitor backend for WebSocket activity:
```bash
tail -f /tmp/daphne.log
```

You should see:
- "WebSocket authenticated user" logs
- "Join conversation request" logs
- "WebSocket send_message called" logs
- "Broadcasting to group" logs