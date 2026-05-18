# Notification System Design

# Stage 1: REST API Design

## Overview

This system helps students receive:
- placement alerts
- interview updates
- announcements

Features:
- create notification
- fetch notifications
- mark as read
- delete notification
- real-time updates

---

## Create Notification

```http
POST /api/notifications
```

```json
{
  "userId":"101",
  "title":"Placement Update",
  "message":"Interview tomorrow"
}
```

---

## Get Notifications

```http
GET /api/notifications?page=1&limit=20
```

```sql
SELECT id,title,message,is_read
FROM notifications
WHERE user_id=$1
ORDER BY created_at DESC
LIMIT 20;
```

---

## Mark as Read

```http
PATCH /api/notifications/:id/read
```

```sql
UPDATE notifications
SET is_read=TRUE
WHERE id=$1;
```

---

## Delete Notification

```http
DELETE /api/notifications/:id
```

---

## Real-Time Notifications

```txt
ws://localhost:3000/notifications
```

```js
ws.send(JSON.stringify(notification));
```

This gives instant updates without refreshing.

---

# Stage 2: Database Design

## Database Choice

PostgreSQL is used because:
- reliable
- scalable
- fast querying

---

## Notifications Table

```sql
CREATE TABLE notifications(
 id UUID PRIMARY KEY,
 user_id UUID,
 title VARCHAR(200),
 message TEXT,
 is_read BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Important Index

```sql
CREATE INDEX idx_user_created
ON notifications(user_id,created_at DESC);
```

This improves:
- filtering
- sorting
- fetch speed

---

# Stage 3: Query Optimization

## Old Query

```sql
SELECT * FROM notifications
WHERE studentID=1042
AND isRead=false;
```

Problems:
- full table scan
- unnecessary columns fetched

---

## Optimized Query

```sql
SELECT id,title,message
FROM notifications
WHERE user_id=$1
AND is_read=FALSE
ORDER BY created_at DESC
LIMIT 20;
```

---

## Better Index

```sql
CREATE INDEX idx_user_read
ON notifications(user_id,is_read);
```

---

# Stage 4: Performance Improvements

## Problem

Every refresh hits database.

With many students:
- DB becomes slow
- server load increases

---

## Redis Caching

```js
const cached=await redis.get(`notif:${userId}`);
```

Benefits:
- faster response
- reduced DB load

---

## Pagination

```http
GET /notifications?page=1&limit=20
```

Loads only small data at a time.

---

## WebSocket

Instead of polling:

```js
setInterval(fetchNotifications,5000);
```

Use:

```js
ws.send(JSON.stringify(notification));
```

Benefits:
- real-time updates
- lower DB traffic

---

# Stage 5: Bulk Notification System

## Problem

HR sends notifications to 50,000 students.

Old approach:

```python
for student in students:
   send_email()
   save_to_db()
```

Problems:
- slow
- timeout risk
- failure handling issue

---

## Better Solution

Use:
- Redis Queue
- BullMQ Workers

---

## Queue Example

```js
await queue.add("send-notification",{
  studentId,
  message
});
```

---

## Worker Example

```js
worker.process(async(job)=>{

 await saveNotification();

 await sendEmail();

});
```

---

## Retry Mechanism

```js
attempts:5
```

Failed jobs retry automatically.

---

# Final Architecture

| Component | Technology |
|---|---|
| Backend | Node.js |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ |
| Real-time | WebSocket |

---

# Final Conclusion

This system provides:
- fast notifications
- real-time updates
- scalable architecture
- reduced database load
- reliable bulk notification delivery