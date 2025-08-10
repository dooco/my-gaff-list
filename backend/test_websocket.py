#!/usr/bin/env python
import asyncio
import websockets
import json

async def test_websocket():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0NjY0ODA0LCJpYXQiOjE3NTQ2NjEyMDQsImp0aSI6IjVkMDUxMjIyZjQ2NTQzNzFiNWU2YWJmZTY3MmQ1OWY1IiwidXNlcl9pZCI6IjYyOGIxYTJhLTNlOWUtNDM5MC1iODNhLWIyZjE2Y2U5YTRiYyJ9.dqFlomybABtAL1VNXnmqLicJd7msU6dOZ6IinPGMJII"
    
    uri = f"ws://localhost:8000/ws/messages/?token={token}"
    
    print(f"Connecting to WebSocket...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            
            # Listen for messages
            async def listen():
                while True:
                    try:
                        message = await websocket.recv()
                        data = json.loads(message)
                        print(f"Received: {data}")
                    except Exception as e:
                        print(f"Error receiving: {e}")
                        break
            
            # Start listening in background
            asyncio.create_task(listen())
            
            # Send join conversation message
            join_msg = {
                "type": "join_conversation",
                "conversation_id": "139cddcd-ab35-401c-bb30-a78896a32314"
            }
            await websocket.send(json.dumps(join_msg))
            print(f"Sent: {join_msg}")
            
            # Send a test message
            await asyncio.sleep(1)
            test_msg = {
                "type": "send_message",
                "conversation_id": "139cddcd-ab35-401c-bb30-a78896a32314",
                "content": "Test message from Python"
            }
            await websocket.send(json.dumps(test_msg))
            print(f"Sent: {test_msg}")
            
            # Wait a bit for responses
            await asyncio.sleep(5)
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())