const express = require("express");
const router = express.Router();
const { users, products, productionLines } = require("../data/seed");
const { authenticate, requireRole } = require("../middleware/auth");

// Read-only endpoints for products and production-lines (all authenticated users)
router.get("/products", authenticate, (req, res) => {
  res.json(products);
});

router.get("/production-lines", authenticate, (req, res) => {
  res.json(productionLines);
});

// All other settings routes require admin role
router.use(authenticate, requireRole("admin"));

// ─── USERS ───────────────────────────────────────────────

router.get("/users", (req, res) => {
  const safe = users.map(({ password, ...u }) => u);
  res.json(safe);
});

router.post("/users", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required" });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "Email already exists" });
  }
  const id = `USR-${String(users.length + 1).padStart(3, "0")}`;
  const user = { id, name, email, password, role, createdAt: new Date().toISOString() };
  users.push(user);
  const { password: _, ...safe } = user;
  res.status(201).json(safe);
});

router.put("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, email, password, role } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) {
    if (users.find((u) => u.email === email && u.id !== user.id)) {
      return res.status(409).json({ error: "Email already exists" });
    }
    user.email = email;
  }
  if (password !== undefined) user.password = password;
  if (role !== undefined) user.role = role;

  const { password: _, ...safe } = user;
  res.json(safe);
});

router.delete("/users/:id", (req, res) => {
  const index = users.findIndex((u) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  users.splice(index, 1);
  res.json({ message: "User deleted" });
});

// ─── PRODUCTION LINES ────────────────────────────────────

router.post("/production-lines", (req, res) => {
  const { name, location, capacity, capacityUnit, status } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: "name and location are required" });
  }
  const id = `LINE-${String(productionLines.length + 1).padStart(2, "0")}`;
  const line = {
    id,
    name,
    location,
    capacity: capacity || 0,
    capacityUnit: capacityUnit || "units/hr",
    status: status || "active",
    createdAt: new Date().toISOString(),
  };
  productionLines.push(line);
  res.status(201).json(line);
});

router.put("/production-lines/:id", (req, res) => {
  const line = productionLines.find((l) => l.id === req.params.id);
  if (!line) return res.status(404).json({ error: "Production line not found" });

  const { name, location, capacity, capacityUnit, status } = req.body;
  if (name !== undefined) line.name = name;
  if (location !== undefined) line.location = location;
  if (capacity !== undefined) line.capacity = capacity;
  if (capacityUnit !== undefined) line.capacityUnit = capacityUnit;
  if (status !== undefined) line.status = status;

  res.json(line);
});

router.delete("/production-lines/:id", (req, res) => {
  const index = productionLines.findIndex((l) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Production line not found" });
  productionLines.splice(index, 1);
  res.json({ message: "Production line deleted" });
});

// ─── PRODUCTS ────────────────────────────────────────────

router.post("/products", (req, res) => {
  const { name, category, unit } = req.body;
  if (!name || !category || !unit) {
    return res.status(400).json({ error: "name, category, and unit are required" });
  }
  const id = `PRD-${String(products.length + 1).padStart(3, "0")}`;
  const product = { id, name, category, unit, createdAt: new Date().toISOString() };
  products.push(product);
  res.status(201).json(product);
});

router.put("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { name, category, unit } = req.body;
  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (unit !== undefined) product.unit = unit;

  res.json(product);
});

router.delete("/products/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });
  products.splice(index, 1);
  res.json({ message: "Product deleted" });
});

module.exports = router;
