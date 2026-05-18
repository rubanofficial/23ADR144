import express from 'express';

const app = express();
const port = process.env.PORT || 3000;
const REMOTE_NOTIFICATION_API = 'http://4.224.186.213/evaluation-service/notifications';

const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

app.use(express.json());

function normalizeType(value) {
  if (!value) return 'Event';
  const type = String(value).trim();
  const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return TYPE_WEIGHTS[normalized] ? normalized : 'Event';
}

function parseTimestamp(notification) {
  return new Date(
    notification.timestamp || notification.Timestamp || notification.createdAt || notification.created_at || Date.now()
  );
}

function scoreNotification(notification) {
  const type = normalizeType(notification.notification_type || notification.notificationType || notification.Type || notification.type);
  const weight = TYPE_WEIGHTS[type] || 1;
  const ageMs = Date.now() - parseTimestamp(notification).getTime();
  const ageSeconds = Math.max(0, ageMs / 1000);
  const recencyBonus = Math.max(0, 7 * 24 * 3600 - ageSeconds);
  return weight * 100000 + recencyBonus;
}

class MinHeap {
  constructor(limit) {
    this.limit = limit;
    this.heap = [];
  }

  push(item) {
    if (this.heap.length < this.limit) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
      return;
    }

    if (item.score <= this.heap[0].score) return;

    this.heap[0] = item;
    this._bubbleDown(0);
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[index].score >= this.heap[parent].score) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.heap[left].score < this.heap[smallest].score) {
        smallest = left;
      }
      if (right < length && this.heap[right].score < this.heap[smallest].score) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }

  sorted() {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }
}

async function fetchNotifications(userId, authHeader) {
  const url = new URL(REMOTE_NOTIFICATION_API);
  if (userId) url.searchParams.set('userId', userId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Remote API error: ${response.status} ${body}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload.notifications) return payload.notifications;
  if (payload.data) return payload.data;
  return [];
}

function formatNotification(notification) {
  return {
    id: notification.id || notification.ID || notification.notification_id || notification.notificationId,
    title: notification.title || notification.Title || notification.message || notification.Message,
    message: notification.message || notification.Message || '',
    type: normalizeType(notification.notification_type || notification.notificationType || notification.Type || notification.type),
    timestamp: parseTimestamp(notification).toISOString(),
  };
}

app.get('/api/notifications/priority', async (req, res) => {
  const userId = req.query.userId;
  const top = Math.max(1, Math.min(50, Number(req.query.top) || 10));
  const authHeader = req.headers.authorization;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  try {
    const notifications = await fetchNotifications(userId, authHeader);
    const heap = new MinHeap(top);

    for (const notification of notifications) {
      const score = scoreNotification(notification);
      heap.push({ notification, score });
    }

    const topNotifications = heap.sorted().map((item) => ({
      ...formatNotification(item.notification),
      score: item.score,
    }));

    return res.json({
      total: topNotifications.length,
      notifications: topNotifications,
    });
  } catch (error) {
    console.error('Priority route error:', error.message);
    return res.status(502).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Notification backend is running' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
