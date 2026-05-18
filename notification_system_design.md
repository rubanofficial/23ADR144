# Stage 1: REST API Design for Notification System

## Overview

The notification system provides REST APIs for managing user notifications. Core actions include creating notifications, retrieving notifications, marking as read, and deleting notifications. The system supports real-time notification delivery through WebSocket connections.

## Core Actions

1. **Create Notification** - POST /notifications
2. **Get Notifications** - GET /notifications
3. **Mark as Read** - PATCH /notifications/:id/read
4. **Delete Notification** - DELETE /notifications/:id
5. **Subscribe to Real-time Updates** - WebSocket /notifications/stream

## API Endpoints

### 1. Create Notification

**Endpoint:** `POST /notifications`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "userId": "user-123",
  "title": "string",
  "message": "string",
  "type": "info|warning|error|success",
  "priority": "low|medium|high",
  "actionUrl": "string (optional)",
  "data": "object (optional)"
}
```

**Response (201 Created):**
```json
{
  "id": "notif-uuid",
  "userId": "user-123",
  "title": "string",
  "message": "string",
  "type": "info",
  "priority": "high",
  "actionUrl": "string",
  "data": {},
  "isRead": false,
  "createdAt": "2026-05-18T10:30:00Z",
  "updatedAt": "2026-05-18T10:30:00Z"
}
```

---

### 2. Get Notifications

**Endpoint:** `GET /notifications`

**Query Parameters:**
- `userId` (required)
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)
- `isRead` (optional: true|false)
- `type` (optional: info|warning|error|success)

**Request Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (200 OK):**
```json
{
  "total": 150,
  "limit": 20,
  "offset": 0,
  "notifications": [
    {
      "id": "notif-uuid",
      "userId": "user-123",
      "title": "string",
      "message": "string",
      "type": "info",
      "priority": "high",
      "actionUrl": "string",
      "data": {},
      "isRead": false,
      "createdAt": "2026-05-18T10:30:00Z",
      "updatedAt": "2026-05-18T10:30:00Z"
    }
  ]
}
```

---

### 3. Mark Notification as Read

**Endpoint:** `PATCH /notifications/:id/read`

**Request Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Request Body:**
```json
{
  "isRead": true
}
```

**Response (200 OK):**
```json
{
  "id": "notif-uuid",
  "userId": "user-123",
  "title": "string",
  "message": "string",
  "type": "info",
  "priority": "high",
  "isRead": true,
  "createdAt": "2026-05-18T10:30:00Z",
  "updatedAt": "2026-05-18T10:35:00Z"
}
```

---

### 4. Delete Notification

**Endpoint:** `DELETE /notifications/:id`

**Request Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response (204 No Content)**

---

### 5. Real-time Notification Stream (WebSocket)

**Endpoint:** `WebSocket /notifications/stream`

**Connection:**
```js
const socket = new WebSocket('ws://localhost:3000/notifications/stream?token={token}&userId={userId}');

socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('New notification:', notification);
};
```

**Message Format:**
```json
{
  "event": "notification:created",
  "data": {
    "id": "notif-uuid",
    "userId": "user-123",
    "title": "string",
    "message": "string",
    "type": "info",
    "priority": "high",
    "createdAt": "2026-05-18T10:30:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Field 'userId' is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "details": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "details": "Notification with id 'notif-uuid' not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "An unexpected error occurred"
}
```

---

## JSON Schema

### Notification Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "userId": { "type": "string", "minLength": 1 },
    "title": { "type": "string", "minLength": 1, "maxLength": 200 },
    "message": { "type": "string", "minLength": 1, "maxLength": 1000 },
    "type": { "enum": ["info", "warning", "error", "success"] },
    "priority": { "enum": ["low", "medium", "high"] },
    "actionUrl": { "type": "string", "format": "uri" },
    "data": { "type": "object" },
    "isRead": { "type": "boolean" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "userId", "title", "message", "type", "priority"]
}
```

---

## Real-time Mechanism

### WebSocket Connection Flow

1. **Client connects** to `/notifications/stream` with token and userId
2. **Server validates** token and userId
3. **Server subscribes** user to notification channel
4. **Server pushes** new notifications in real-time as they are created
5. **Client receives** and processes notification events

### Implementation Pattern

```js
// Server side (using express + ws)
import WebSocket from 'ws';

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const token = url.searchParams.get('token');
  const userId = url.searchParams.get('userId');
  
  if (!validateToken(token)) {
    socket.destroy();
    return;
  }
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.userId = userId;
    notificationChannels.set(userId, ws);
    
    ws.on('close', () => {
      notificationChannels.delete(userId);
    });
  });
});

// Broadcast notification to user
function notifyUser(userId, notification) {
  const ws = notificationChannels.get(userId);
  if (ws) {
    ws.send(JSON.stringify({
      event: 'notification:created',
      data: notification
    }));
  }
}
```
