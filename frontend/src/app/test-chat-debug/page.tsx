'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedWebSocketService } from '@/services/websocketEnhanced';
import ConnectionStatus from '@/components/messaging/ConnectionStatus';

export default function TestChatDebugPage() {
  const { user, isAuthenticated } = useAuth();
  const [conversationId] = useState('139cddcd-ab35-401c-bb30-a78896a32314');
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [health, setHealth] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      addLog('Not authenticated, waiting...');
      return;
    }

    addLog(`Authenticated as: ${user?.email}`);
    
    // Subscribe to health updates
    const unsubscribeHealth = enhancedWebSocketService.subscribeToHealth((healthData) => {
      setHealth(healthData);
      setIsConnected(healthData.connected);
      
      if (healthData.connected) {
        addLog('✅ WebSocket connected');
      } else if (healthData.lastDisconnectedAt) {
        addLog(`❌ WebSocket disconnected at ${healthData.lastDisconnectedAt}`);
      }
    });

    // Connect to WebSocket
    addLog('Attempting WebSocket connection...');
    enhancedWebSocketService.connect({
      onOpen: () => {
        addLog('🔗 WebSocket opened successfully');
        // Join conversation
        addLog(`Joining conversation: ${conversationId}`);
        enhancedWebSocketService.joinConversation(conversationId);
      },
      onClose: (event) => {
        addLog(`WebSocket closed: ${event.code} - ${event.reason}`);
      },
      onError: (error) => {
        addLog(`❌ WebSocket error: ${error}`);
      },
      onMessage: (data) => {
        addLog(`📨 Received: ${data.type}`);
        console.log('Full message data:', data);
        
        if (data.type === 'new_message' && data.message) {
          addLog(`New message from ${data.message.sender}: ${data.message.content}`);
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'joined_conversation') {
          addLog(`✅ Joined conversation: ${data.conversation_id}`);
        } else if (data.type === 'connection_established') {
          addLog(`✅ Connection established for user: ${data.user_id}`);
        } else if (data.type === 'error') {
          addLog(`❌ Server error: ${data.message}`);
        }
      }
    }).catch(error => {
      addLog(`Failed to connect: ${error.message}`);
    });

    return () => {
      addLog('Cleaning up WebSocket connection');
      enhancedWebSocketService.leaveConversation(conversationId);
      unsubscribeHealth();
    };
  }, [isAuthenticated, user, conversationId]);

  const sendMessage = () => {
    if (!messageText.trim() || !isConnected) {
      addLog('Cannot send: not connected or empty message');
      return;
    }

    addLog(`Sending message: ${messageText}`);
    const sent = enhancedWebSocketService.sendMessage(conversationId, messageText);
    
    if (sent) {
      addLog('✅ Message sent successfully');
      // Add optimistic update
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`,
        content: messageText,
        sender: user?.id,
        created_at: new Date().toISOString(),
        is_read: false
      }]);
      setMessageText('');
    } else {
      addLog('❌ Failed to send message');
    }
  };

  const testPing = () => {
    addLog('Sending ping...');
    enhancedWebSocketService.send({ type: 'ping', timestamp: Date.now() });
  };

  const reconnect = () => {
    addLog('Manual reconnect requested');
    enhancedWebSocketService.reconnect();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold mb-4">WebSocket Debug Console</h1>
          
          {/* Status Section */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Connection Status</h3>
              <ConnectionStatus showDetails />
              <div className="mt-2 space-y-1 text-sm">
                <div>User: {user?.email || 'Not logged in'}</div>
                <div>User ID: {user?.id || 'N/A'}</div>
                <div>Conversation: {conversationId}</div>
                <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
              </div>
            </div>
            
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Health Metrics</h3>
              {health && (
                <div className="space-y-1 text-sm">
                  <div>Attempts: {health.connectionAttempts}</div>
                  <div>Reconnects: {health.reconnectCount}</div>
                  <div>Messages Sent: {health.messagesSent}</div>
                  <div>Messages Received: {health.messagesReceived}</div>
                  <div>Latency: {health.latency}ms</div>
                  <div>Errors: {health.errors?.length || 0}</div>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={reconnect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
            <button
              onClick={testPing}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Ping
            </button>
            <button
              onClick={() => {
                addLog('Joining conversation manually');
                enhancedWebSocketService.joinConversation(conversationId);
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Join Conversation
            </button>
          </div>

          {/* Message Section */}
          <div className="border rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">Send Message</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !messageText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Send
              </button>
            </div>
          </div>

          {/* Messages Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Messages ({messages.length})</h3>
              <div className="h-64 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-gray-500">No messages yet</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg.id || idx} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-semibold">
                        {msg.sender === user?.id ? 'You' : `User ${msg.sender?.slice(0, 8)}`}
                      </div>
                      <div>{msg.content}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Debug Logs</h3>
              <div className="h-64 overflow-y-auto">
                <pre className="text-xs font-mono">
                  {logs.join('\n')}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Debug Instructions:</h3>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Check that you are logged in (user email should show)</li>
            <li>Verify connection status is green</li>
            <li>Look for "Joined conversation" in the logs</li>
            <li>Try sending a test message</li>
            <li>Open this same page in another browser with different user</li>
            <li>Check browser console for additional errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}