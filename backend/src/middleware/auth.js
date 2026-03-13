const { users } = require("../data/seed");

function authenticate(req, res, next) {
  let userId = req.headers["x-user-id"];

  // Also support Authorization: Bearer <base64-encoded-user-id>
  if (!userId) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        userId = Buffer.from(token, "base64").toString("utf8");
      } catch {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Invalid user" });
  }

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `Requires one of roles: ${roles.join(", ")}` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
