module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let key;
  if (req.method === "GET") {
    const u = new URL(req.url, "https://nixus-license.vercel.app");
    key = u.searchParams.get("key") || "";
  } else if (req.method === "POST") {
    key = (req.body || {}).key || "";
  } else {
    return res.status(405).end();
  }

  if (!key) return res.json({ valid: false, error: "No key provided" });

  const strip = (k) => k.replace(/[^A-Z0-9]/g, "").toUpperCase();

  const validKeys = (process.env.VALID_KEYS || "")
    .split(",")
    .map(strip)
    .filter(Boolean);

  const revokedKeys = (process.env.REVOKED_KEYS || "")
    .split(",")
    .map(strip)
    .filter(Boolean);

  const normalized = strip(key);

  if (revokedKeys.includes(normalized)) {
    return res.json({ valid: false, error: "License revoked" });
  }

  if (validKeys.includes(normalized)) {
    return res.json({ valid: true });
  }

  return res.json({ valid: false, error: "Invalid license key" });
};
