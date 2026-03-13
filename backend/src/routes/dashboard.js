const express = require("express");
const router = express.Router();
const { orders, activityLog } = require("../data/seed");
const { authenticate } = require("../middleware/auth");

router.get("/", authenticate, (req, res) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Summary
  const totalOrders = orders.length;
  const inProduction = orders.filter((o) => o.status === "in_production").length;
  const completedToday = orders.filter(
    (o) => o.status === "completed" && o.updatedAt && o.updatedAt.slice(0, 10) === todayStr
  ).length;
  const qualityHold = orders.filter((o) => o.status === "quality_hold").length;

  const summary = {
    totalOrders,
    inProduction,
    completedToday,
    qualityHold,
    trends: {
      totalOrders: 12,
      inProduction: -5,
      completedToday: 8,
      qualityHold: -15,
    },
  };

  // Chart data: last 7 days of production counts
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = activityLog.filter(
      (a) =>
        a.toStatus === "completed" &&
        a.timestamp.slice(0, 10) === dateStr
    ).length;
    // Add some baseline so chart isn't all zeros for demo
    chartData.push({ date: dateStr, count: count + Math.floor(Math.random() * 3) + 1 });
  }

  // Recent orders: last 5 by updatedAt
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  // Activity feed: last 10 entries
  const activityFeed = [...activityLog]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  res.json({ summary, chartData, recentOrders, activityFeed });
});

module.exports = router;
