# Message Duplication Fix Test Plan

## Issue
Messages were appearing twice when sent by either landlord or tenant due to:
1. Optimistic message being added immediately to the UI
2. Server broadcasting the message back to all participants (including sender)
3. The duplicate check failing because temp ID didn't match server ID

## Solution Implemented

### Frontend Changes

1. **Enhanced Chat Interface (`EnhancedChatInterface.tsx`)**:
   - Modified the WebSocket message handler to properly handle temp IDs
   - When receiving a `new_message` event:
     - First checks if there's a temp_id and replaces the optimistic message
     - Falls back to content matching for messages from the same sender
     - Only adds messages from other users (not the sender)
   - Sends temp_id with the message for tracking

2. **WebSocket Messages Hook (`useWebSocketMessages.ts`)**:
   - Updated to include temp_id when sending messages
   - Properly replaces optimistic messages when server response arrives
   - Prevents duplicate messages by checking for existing message IDs

### Backend Changes

The backend (`consumers.py`) was already correctly broadcasting messages with temp_id support.

## Testing Steps

1. **Setup**:
   - Open two browser windows (incognito/normal)
   - Login as landlord in one window
   - Login as tenant in the other window
   - Navigate to the same conversation

2. **Test Cases**:

   a. **Single Message Test**:
      - Send a message from landlord
      - Verify it appears only once in landlord's window
      - Verify it appears only once in tenant's window
      
   b. **Rapid Message Test**:
      - Send multiple messages quickly from one user
      - Verify no duplicates appear
      
   c. **Simultaneous Messages**:
      - Both users type and send messages at nearly the same time
      - Verify correct ordering and no duplicates
      
   d. **Network Interruption Test**:
      - Disable network briefly
      - Send a message (should queue)
      - Re-enable network
      - Verify message sends only once

## Expected Behavior

- Messages should appear immediately (optimistic update)
- When server confirms, the temp message should be replaced (not duplicated)
- Messages from other users should appear once
- Message status should update from "sending" to "sent" to "delivered" to "read"

## Verification Points

1. Check browser console for logs:
   - "Replacing optimistic message with server response" - should appear when own message is confirmed
   - "Message already exists, skipping" - should prevent duplicates
   - No duplicate message IDs in the message list

2. Check network tab:
   - WebSocket frames should show temp_id being sent
   - Server response should include the temp_id for matching

## Common Issues to Watch For

1. If messages still duplicate:
   - Check if temp_id is being properly sent and received
   - Verify the message matching logic in handleWebSocketMessage
   
2. If messages disappear:
   - Check if the replacement logic is working correctly
   - Ensure message IDs are unique

3. If messages don't appear for other user:
   - Verify WebSocket connection is established
   - Check if user is properly joined to conversation group