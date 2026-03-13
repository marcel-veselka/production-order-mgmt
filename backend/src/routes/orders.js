const express = require("express");
const router = express.Router();
const { orders, activityLog, products, users, productionLines, nextOrderNumber, nextActivityId } = require("../data/seed");
const { authenticate } = require("../middleware/auth");

// Enrich an order with resolved names
function enrichOrder(order) {
  const enriched = { ...order };
  if (order.assignedTo) {
    const u = users.find((u) => u.id === order.assignedTo);
    enriched.assignedToName = u ? u.name : order.assignedTo;
  }
  if (order.productionLineId) {
    const pl = productionLines.find((l) => l.id === order.productionLineId);
    enriched.productionLineName = pl ? pl.name : order.productionLineId;
  }
  return enriched;
}

// Valid status transitions: action -> { from: [...], to, roles: [...] }
const transitions = {
  submit:             { from: ["draft"],           to: "submitted",     roles: ["admin", "supervisor", "operator"] },
  approve:            { from: ["submitted"],       to: "approved",      roles: ["admin", "supervisor"] },
  reject:             { from: ["submitted"],       to: "draft",         roles: ["admin", "supervisor"] },
  start_production:   { from: ["approved"],        to: "in_production", roles: ["admin", "supervisor"] },
  complete_production:{ from: ["in_production"],   to: "quality_check", roles: ["admin", "supervisor", "operator"] },
  quality_hold:       { from: ["quality_check"],   to: "quality_hold",  roles: ["admin", "supervisor"] },
  release_hold:       { from: ["quality_hold"],    to: "quality_check", roles: ["admin", "supervisor"] },
  complete:           { from: ["quality_check"],   to: "completed",     roles: ["admin", "supervisor"] },
};

// GET /api/orders
router.get("/", authenticate, (req, res) => {
  const { status, search, sortBy = "createdAt", sortDir = "desc", page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  let filtered = [...orders];

  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(s) ||
        o.product.toLowerCase().includes(s) ||
        (o.notes && o.notes.toLowerCase().includes(s))
    );
  }

  filtered.sort((a, b) => {
    const aVal = a[sortBy] || "";
    const bVal = b[sortBy] || "";
    if (sortDir === "asc") return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const data = filtered.slice(start, start + limitNum).map(enrichOrder);

  res.json({ data, total, page: pageNum, totalPages });
});

// POST /api/orders
router.post("/", authenticate, (req, res) => {
  const { productId, quantity, priority, shift, notes, dueDate, assignedTo, productionLineId } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: "productId and quantity are required" });
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    return res.status(400).json({ error: "Invalid productId" });
  }

  const now = new Date().toISOString();
  const orderNumber = nextOrderNumber();
  const order = {
    id: orderNumber,
    orderNumber,
    productId,
    product: product.name,
    quantity: parseInt(quantity, 10),
    priority: priority || "medium",
    status: "draft",
    assignedTo: assignedTo || null,
    productionLineId: productionLineId || null,
    shift: shift || "morning",
    notes: notes || "",
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };

  orders.push(order);

  activityLog.push({
    id: nextActivityId(),
    timestamp: now,
    userId: req.user.id,
    orderId: order.id,
    action: "created",
    fromStatus: null,
    toStatus: "draft",
    comment: "Order created",
  });

  res.status(201).json(order);
});

// GET /api/orders/:id
router.get("/:id", authenticate, (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const activity = activityLog
    .filter((a) => a.orderId === order.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ ...enrichOrder(order), activity });
});

// PUT /api/orders/:id
router.put("/:id", authenticate, (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!["draft", "returned"].includes(order.status)) {
    return res.status(400).json({ error: "Can only edit orders in draft or returned status" });
  }

  const { productId, quantity, priority, shift, notes, dueDate, assignedTo, productionLineId } = req.body;

  if (productId) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return res.status(400).json({ error: "Invalid productId" });
    }
    order.productId = productId;
    order.product = product.name;
  }
  if (quantity !== undefined) order.quantity = parseInt(quantity, 10);
  if (priority !== undefined) order.priority = priority;
  if (shift !== undefined) order.shift = shift;
  if (notes !== undefined) order.notes = notes;
  if (dueDate !== undefined) order.dueDate = dueDate;
  if (assignedTo !== undefined) order.assignedTo = assignedTo;
  if (productionLineId !== undefined) order.productionLineId = productionLineId;

  order.updatedAt = new Date().toISOString();

  res.json(order);
});

// DELETE /api/orders/:id
router.delete("/:id", authenticate, (req, res) => {
  const index = orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (orders[index].status !== "draft") {
    return res.status(400).json({ error: "Can only delete draft orders" });
  }

  orders.splice(index, 1);
  res.json({ message: "Order deleted" });
});

// POST /api/orders/:id/transition
router.post("/:id/transition", authenticate, (req, res) => {
  const { action, comment } = req.body;

  if (!action) {
    return res.status(400).json({ error: "action is required" });
  }

  const transition = transitions[action];
  if (!transition) {
    return res.status(400).json({ error: `Invalid action: ${action}` });
  }

  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (!transition.roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Role '${req.user.role}' cannot perform '${action}'` });
  }

  if (!transition.from.includes(order.status)) {
    return res.status(400).json({
      error: `Cannot '${action}' from status '${order.status}'. Valid from: ${transition.from.join(", ")}`,
    });
  }

  const now = new Date().toISOString();
  const fromStatus = order.status;
  order.status = transition.to;
  order.updatedAt = now;

  activityLog.push({
    id: nextActivityId(),
    timestamp: now,
    userId: req.user.id,
    orderId: order.id,
    action,
    fromStatus,
    toStatus: transition.to,
    comment: comment || `Status changed from ${fromStatus} to ${transition.to}`,
  });

  res.json(order);
});

module.exports = router;
