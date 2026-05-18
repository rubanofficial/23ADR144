# Stage 1: REST API Design for Notification System

## Overview

The notification system is used to send and manage notifications for users.

Users can:
- Create notifications
- View notifications
- Mark notifications as read
- Delete notifications
- Receive real-time updates using WebSocket

---

## Main APIs

### 1. Create Notification

**Endpoint:** `POST /notifications`

Used to create a new notification for a user.

### Example Request

```json
{
  "userId": "user-123",
  "title": "Placement Update",
  "message": "Interview scheduled tomorrow",
  "type": "info",
  "priority": "high"
}
```

---

### 2. Get Notifications

**Endpoint:** `GET /notifications`

Used to fetch notifications with filters like:
- read/unread
- notification type
- pagination

---

### 3. Mark Notification as Read

**Endpoint:** `PATCH /notifications/:id/read`

Updates notification status from unread to read.

---

### 4. Delete Notification

**Endpoint:** `DELETE /notifications/:id`

Used to remove a notification.

---

### 5. Real-Time Notifications

**Endpoint:** `WebSocket /notifications/stream`

WebSocket helps users receive notifications instantly without refreshing the page.

---

## Error Handling

### 400 – Bad Request
Invalid request data.

### 401 – Unauthorized
Invalid or expired token.

### 404 – Not Found
Notification not available.

### 500 – Internal Server Error
Unexpected server issue.

---

# Stage 2: Database Schema and Persistence

## Database Choice

I selected **PostgreSQL** because:

- Reliable and secure
- Supports JSON data
- Good query performance
- Handles large-scale data efficiently

MongoDB was also considered, but PostgreSQL is better here because notifications follow a structured format.

---

## Main Tables

### Users Table

Stores user information like:
- id
- email
- name

---

### Notifications Table

Stores notification details like:
- title
- message
- type
- priority
- read status
- timestamps

### Example Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(200),
  message TEXT,
  type VARCHAR(20),
  priority VARCHAR(10),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Important Indexes

```sql
CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);
```

### Why indexes are needed?

Indexes improve:
- search speed
- filtering
- sorting performance

Especially useful when millions of notifications are stored.

---

## Scalability Challenges and Solutions

### Problem 1: Huge Notification Data

As users increase, notification records grow rapidly.

### Solution

Use **table partitioning** and archive old data.

---

### Problem 2: Slow Queries

### Solution

Use composite indexes like:

```sql
(user_id, created_at)
```

This helps fetch notifications quickly.

---

### Problem 3: High Write Traffic

### Solution

Use:
- connection pooling
- read replicas
- optimized PostgreSQL configuration

---

# Stage 3: Query Performance Analysis and Optimization

## Original Query

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

---

## Problems in This Query

### 1. Full Table Scan

Without indexes, PostgreSQL checks all rows.

### 2. Using `SELECT *`

Fetches unnecessary columns and increases load.

### 3. Sorting Cost

Sorting large data without index becomes slow.

---

## Optimized Query

```sql
SELECT id, title, message, created_at
FROM notifications
WHERE student_id = 1042
AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;
```

---

## Improvements Made

- Avoided `SELECT *`
- Added `LIMIT`
- Used proper indexing
- Reduced unnecessary data fetching

---

## Best Index for This Query

```sql
CREATE INDEX idx_notif_student_unread
ON notifications(student_id, is_read, created_at DESC);
```

This improves:
- filtering speed
- sorting speed
- query execution time

---

## Why We Should Not Index Every Column

Indexing every column is not recommended because:

- Slows down INSERT and UPDATE operations
- Consumes more storage
- Increases maintenance overhead

### Best Practice

Only index frequently searched columns.

---

## Final Conclusion

The notification system is designed to be:

- scalable
- fast
- real-time enabled
- optimized for large datasets

Using PostgreSQL, indexing, partitioning, and WebSocket makes the system efficient even when handling millions of notifications.