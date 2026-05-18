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

---

# Stage 2: Database Schema and Persistence

## Database Selection

After thinking about the requirements, I decided on **PostgreSQL** for the following reasons:

1. **ACID Compliance** - Notifications are critical; we need guaranteed consistency
2. **JSON Support** - The `data` field in notifications can store arbitrary JSON, which is useful for flexible notification metadata
3. **Full-text Search** - Future queries may need to search notification titles/messages
4. **Scalability** - PostgreSQL can handle millions of records with proper indexing
5. **Cost-effective** - Open source and stable

I also considered **MongoDB** but felt the structured nature of notifications (fixed schema with userId, title, message, etc.) benefits more from relational constraints.

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  action_url VARCHAR(500),
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type_priority ON notifications(type, priority);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
```

Why these indexes?
- `idx_notifications_user_id` - Essential for queries filtering by user
- `idx_notifications_created_at` - Speeds up sorting by creation date
- `idx_notifications_is_read` - Optimization for "unread notifications" queries
- `idx_notifications_type_priority` - Helps when filtering by notification type and priority
- `idx_notifications_user_created` - Combined index for the most common query pattern (get notifications for user, ordered by date)

### Notification Preferences Table

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preferences_user_id ON notification_preferences(user_id);
```

### Audit Log Table (for troubleshooting)

```sql
CREATE TABLE notification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_notification_id ON notification_audit_logs(notification_id);
CREATE INDEX idx_audit_user_id ON notification_audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON notification_audit_logs(created_at DESC);
```

---

## Scalability Challenges & Solutions

### Challenge 1: Growing Notification Count

**Problem:** As data grows, the `notifications` table could have millions of rows. Even with indexes, queries might slow down.

**Solution: Partitioning by Date**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  priority VARCHAR(10) NOT NULL,
  action_url VARCHAR(500),
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at));

CREATE TABLE notifications_2026_01 PARTITION OF notifications
  FOR VALUES FROM (2026, 1) TO (2026, 2);
CREATE TABLE notifications_2026_02 PARTITION OF notifications
  FOR VALUES FROM (2026, 2) TO (2026, 3);
-- ... more monthly partitions
```

This way, old notifications can be archived or deleted without impacting queries on recent data.

### Challenge 2: Query Performance for User Notifications

**Problem:** Fetching 20 notifications from a user with millions of total notifications is slow even with indexes.

**Solution: Composite Index on (user_id, created_at)**

The index `idx_notifications_user_created` is already defined above. This allows PostgreSQL to quickly:
1. Find all rows for a user
2. Sort by creation date in a single operation
3. Apply LIMIT/OFFSET

### Challenge 3: High Write Volume

**Problem:** If the system creates thousands of notifications per second, write throughput could become a bottleneck.

**Solution: Read Replicas**

```sql
-- Set up PostgreSQL streaming replication
-- Primary handles writes, replicas handle read-heavy queries
-- Use connection pooling (pgBouncer) to manage connections
```

Also consider: **Batch inserts** and **Write-ahead Logging (WAL)** tuning for PostgreSQL configuration.

### Challenge 4: Storage Growth

**Problem:** The `data` JSONB field and audit logs grow indefinitely.

**Solution: Archive/Purge Strategy**

```sql
-- Archive old notifications to a separate table
CREATE TABLE notifications_archived AS
SELECT * FROM notifications
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Delete archived records from main table
DELETE FROM notifications
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Schedule this monthly with a cron job or database job scheduler
```

---

## SQL Queries Based on Stage 1 APIs

### 1. Create Notification

```sql
INSERT INTO notifications (user_id, title, message, type, priority, action_url, data)
VALUES (
  $1::UUID,
  $2::VARCHAR,
  $3::TEXT,
  $4::VARCHAR,
  $5::VARCHAR,
  $6::VARCHAR,
  $7::JSONB
)
RETURNING id, user_id, title, message, type, priority, action_url, data, is_read, created_at, updated_at;
```

### 2. Get Notifications for User (with pagination)

```sql
SELECT id, user_id, title, message, type, priority, action_url, data, is_read, created_at, updated_at
FROM notifications
WHERE user_id = $1::UUID
  AND ($2::BOOLEAN IS NULL OR is_read = $2)
  AND ($3::VARCHAR IS NULL OR type = $3)
ORDER BY created_at DESC
LIMIT $4::INT
OFFSET $5::INT;
```

### 2b. Get Total Count (for pagination metadata)

```sql
SELECT COUNT(*) as total
FROM notifications
WHERE user_id = $1::UUID
  AND ($2::BOOLEAN IS NULL OR is_read = $2)
  AND ($3::VARCHAR IS NULL OR type = $3);
```

### 3. Mark Notification as Read

```sql
UPDATE notifications
SET is_read = $2::BOOLEAN, updated_at = CURRENT_TIMESTAMP
WHERE id = $1::UUID
RETURNING id, user_id, title, message, type, priority, action_url, data, is_read, created_at, updated_at;
```

### 3b. Mark Multiple Notifications as Read (bulk operation)

```sql
UPDATE notifications
SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1::UUID AND is_read = FALSE
RETURNING id;
```

### 4. Delete Notification

```sql
DELETE FROM notifications
WHERE id = $1::UUID
RETURNING id;
```

### 5. Get Unread Notification Count

```sql
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = $1::UUID AND is_read = FALSE;
```

### 6. Search Notifications (full-text search)

```sql
SELECT id, user_id, title, message, type, priority, action_url, data, is_read, created_at, updated_at
FROM notifications
WHERE user_id = $1::UUID
  AND (
    title ILIKE '%' || $2::VARCHAR || '%'
    OR message ILIKE '%' || $2::VARCHAR || '%'
  )
ORDER BY created_at DESC
LIMIT $3::INT
OFFSET $4::INT;
```

### 7. Get High Priority Notifications

```sql
SELECT id, user_id, title, message, type, priority, action_url, data, is_read, created_at, updated_at
FROM notifications
WHERE user_id = $1::UUID
  AND priority = 'high'
  AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 10;
```

### 8. Cleanup Old Notifications

```sql
DELETE FROM notifications
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '180 days'
AND is_read = TRUE;
```

---

## Data Volume Projections

Assuming average notification size = 2KB, with 1 million active users:

- **Per day:** 10M notifications created (10 per user)
- **Per month:** 300M notifications
- **Yearly:** 3.6B notifications
- **Storage (annual):** ~7.2 TB (with replication, double that)

At this scale, partitioning becomes essential. The queries remain fast because:
1. Most queries target recent data (which is a single partition)
2. Indexes are smaller on partitioned tables
3. Maintenance operations (VACUUM, ANALYZE) run faster on smaller partitions

---

## Performance Considerations

**Query Execution Times (estimated with proper indexing):**

- Get 20 notifications for user: **5-10ms**
- Mark as read: **2-5ms**
- Insert notification: **3-8ms**
- Count unread: **1-3ms**

These times are achieved with:
- Proper indexing strategy
- Query optimization (prepared statements)
- Connection pooling
- Read replicas for read-heavy operations
