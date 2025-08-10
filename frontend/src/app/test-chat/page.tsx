'use client';

import { useState } from 'react';
import ChatInterface from '@/components/messaging/ChatInterface';
import ConnectionStatus from '@/components/messaging/ConnectionStatus';

export default function TestChatPage() {
  const [conversationId, setConversationId] = useState<string>('139cddcd-ab35-401c-bb30-a78896a32314');
  const [recipientName] = useState('Test User');

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WebSocket Chat Test</h1>
              <p className="text-sm text-gray-600 mt-1">
                Testing real-time messaging with WebSocket
              </p>
            </div>
            <ConnectionStatus showDetails />
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Conversation ID:
            </label>
            <input
              type="text"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter conversation ID"
            />
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 bg-white shadow-lg">
          <ChatInterface
            conversationId={conversationId}
            recipientName={recipientName}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-2">Test Instructions:</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Make sure you are logged in</li>
          <li>Check the connection status at the top</li>
          <li>Enter a conversation ID to join a chat room</li>
          <li>Send messages and see them appear in real-time</li>
          <li>Open another browser tab to test real-time updates</li>
        </ol>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">
            The WebSocket will automatically reconnect if disconnected.
            If WebSocket fails, it will fall back to HTTP polling.
          </p>
        </div>
      </div>
    </div>
  );
}