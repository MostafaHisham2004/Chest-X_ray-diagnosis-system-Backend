const clients = new Map();

function writeEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addClient(threadId, res) {
  const key = String(threadId);
  if (!clients.has(key)) {
    clients.set(key, new Set());
  }
  clients.get(key).add(res);

  return () => {
    const bucket = clients.get(key);
    if (!bucket) return;
    bucket.delete(res);
    if (bucket.size === 0) {
      clients.delete(key);
    }
  };
}

function publishMessage(threadId, message) {
  const bucket = clients.get(String(threadId));
  if (!bucket) return;
  for (const res of bucket) {
    writeEvent(res, "message", message);
  }
}

module.exports = { addClient, publishMessage, writeEvent };
