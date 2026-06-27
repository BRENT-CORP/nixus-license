const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
const strip = (k) => (k || "").replace(/[^A-Z0-9]/g, "").toUpperCase();

async function redisGet(key) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

async function redisSet(key, value) {
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}/${encodeURIComponent(JSON.stringify(value))}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const raw = req.method === "GET" ? req.query.key : (req.body || {}).key;
  if (!raw) return res.json({ valid: false, error: "No key provided" });

  const stripped = strip(raw);

  const validKeys = (process.env.VALID_KEYS || "").split(",").map(strip).filter(Boolean);
  const LOCAL_KEYS = ["NIXUSTEST1234ABCD5678"];
  const isValid = validKeys.includes(stripped) || LOCAL_KEYS.includes(stripped);
  if (!isValid) return res.json({ valid: false, error: "Invalid license key" });

  const existing = await redisGet(stripped);
  if (existing) {
    const now = Date.now();
    if (now > existing.expires_at) {
      return res.json({ valid: false, error: "License expired", expired: true });
    }
    const daysLeft = Math.ceil((existing.expires_at - now) / (1000 * 60 * 60 * 24));
    return res.json({ valid: true, days_left: daysLeft, expires_at: existing.expires_at, already_activated: true });
  }

  const now = Date.now();
  const record = { activated_at: now, expires_at: now + EXPIRE_MS };
  await redisSet(stripped, record);

  const daysLeft = 30;
  return res.json({ valid: true, days_left: daysLeft, expires_at: record.expires_at });
};
