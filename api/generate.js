const crypto = require("crypto");

module.exports = function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { adminKey } = req.body || {};
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hex = crypto.randomBytes(8).toString("hex").toUpperCase();
  const key = `NIXUS-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}`;

  return res.json({ key });
};
