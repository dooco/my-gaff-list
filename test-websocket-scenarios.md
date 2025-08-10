# WebSocket Testing Guide for Rentified

## Test Setup

### Users
- **Renter**: Padraig Dooley (padraigdooley@gmail.com)
- **Landlord**: Jim Fixit (jim@fixit.ie)
- **Conversation ID**: dd9fa72e-ede0-4928-9083-c9b932762d31

### Prerequisites
1. Backend running with Daphne: `npm run backend:dev`
2. Fresh tokens generated: `python backend/generate_test_tokens.py`
3. Test interface open: `open test-websocket-dual-users.html`

## Test Scenarios

### ✅ Test 1: Basic Connection
1. Copy Padraig's token from terminal to left panel
2. Copy Jim's token from terminal to right panel
3. Click "Connect" for both users
4. **Expected**: Both panels show "CONNECTED" status in green

### ✅ Test 2: Join Conversation
1. After connecting both users
2. Click "Join Conv" for Padraig
3. Click "Join Conv" for Jim
4. **Expected**: System messages confirm joining conversation

### ✅ Test 3: Send Messages
1. In Padraig's panel, type "Hi Jim, I'm interested in viewing the property"
2. Press Enter or click Send
3. **Expected**: 
   - Message appears in Padraig's panel (right-aligned, green)
   - Message instantly appears in Jim's panel (left-aligned, blue)
   - Stats update for both users

### ✅ Test 4: Bidirectional Messaging
1. In Jim's panel, type "Hi Padraig, when would you like to view it?"
2. Press Enter or click Send
3. **Expected**: Message flows from Jim to Padraig in real-time

### ✅ Test 5: Typing Indicators
1. Padraig starts typing (don't press Enter)
2. **Expected**: Jim's panel shows "Padraig is typing..."
3. Padraig stops typing (wait 2 seconds)
4. **Expected**: Typing indicator disappears in Jim's panel

### ✅ Test 6: Rapid Messages
1. Send 5 quick messages from Padraig:
   - "Message 1"
   - "Message 2"
   - "Message 3"
   - "Message 4"
   - "Message 5"
2. **Expected**: All messages delivered in order to both panels

### ✅ Test 7: Reconnection Test
1. Click "Disconnect" for Padraig
2. Send a message from Jim
3. Click "Connect" for Padraig
4. Click "Join Conv" for Padraig
5. **Expected**: Padraig can still send/receive messages

### ✅ Test 8: Error Handling
1. Disconnect both users
2. Try to send a message
3. **Expected**: Error logged, no crash

### ✅ Test 9: Long Connection
1. Keep both users connected for 5 minutes
2. Send a message after 5 minutes
3. **Expected**: Message still delivered (ping/pong keeps connection alive)

### ✅ Test 10: Concurrent Activity
1. Both users type simultaneously
2. Both send messages at nearly the same time
3. **Expected**: No message loss, proper ordering

## Monitoring

### Check Logs
- Browser console: Open DevTools (F12)
- Toggle Logs button: Shows WebSocket activity
- Server logs: `tail -f /tmp/daphne.log`

### Key Indicators
- Green status = Connected
- Message counters update correctly
- No AttributeError in server logs
- Typing indicators appear/disappear properly

## Troubleshooting

### Connection Failed
- Check token hasn't expired (regenerate if needed)
- Ensure Daphne is running on port 8000
- Check CORS settings are correct

### Messages Not Delivering
- Ensure both users joined the conversation
- Check conversation ID is correct
- Verify WebSocket connection is active

### Typing Indicators Not Working
- Must be in same conversation
- Both users must be connected
- Check browser console for errors

## Success Criteria
✅ Both users can connect with their tokens
✅ Real-time message delivery works
✅ Typing indicators function correctly
✅ No errors in console or server logs
✅ Connection remains stable over time
✅ Reconnection works smoothly

## Commands Reference
```bash
# Generate fresh tokens
python backend/generate_test_tokens.py

# Start backend
npm run backend:dev

# Monitor logs
tail -f /tmp/daphne.log

# Open test interface
open test-websocket-dual-users.html
```