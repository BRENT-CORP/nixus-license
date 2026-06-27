const strip = (k) => (k || "").replace(/[^A-Z0-9]/g, "").toUpperCase();

async function redisGet(key) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const raw = req.query.key || (req.body || {}).key;
  if (!raw) return res.json({ valid: false, error: "No key provided" });

  const stripped = strip(raw);
  const record = await redisGet(stripped);

  if (!record) return res.json({ valid: false, status: "not_found" });

  const now = Date.now();
  if (now > record.expires_at) {
    return res.json({ valid: false, status: "expired", days_left: 0, expires_at: record.expires_at });
  }

  const daysLeft = Math.ceil((record.expires_at - now) / (1000 * 60 * 60 * 24));
  return res.json({ valid: true, status: "active", days_left: daysLeft, expires_at: record.expires_at });
};
