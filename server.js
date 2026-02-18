/**
 * Minimal Node.js backend for the Fall Detection Dashboard.
 *
 * Run:
 *   npm init -y
 *   npm i express cors ws
 *   node server.js
 *
 * Endpoints:
 *   GET  /api/rooms
 *   GET  /api/rooms/:roomId/events
 *   POST /api/alerts/:alertId/ack
 *   POST /api/ingest/event
 *
 * WebSocket:
 *   ws://localhost:3001/ws
 */
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

const rooms = new Map();
const events = [];
const alerts = new Map();

function minutesAgoIso(mins) {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

function seed() {
  const sensorTypes = ["MOTION", "BED_PRESSURE", "DOOR", "IMU", "CAMERA"];
  for (let i = 1; i <= 140; i++) {
    const id = String(i).padStart(3, "0");
    const sensors = sensorTypes.map((t, idx) => ({
      id: `${id}-${idx}`,
      type: t,
      health: Math.random() < 0.96 ? "OK" : "OFFLINE",
      lastSeenAt: minutesAgoIso(Math.floor(Math.random() * 8) + 1),
    }));
    rooms.set(id, {
      id,
      label: `Room ${i}`,
      status: "NORMAL",
      lastMovementAt: minutesAgoIso(Math.floor(Math.random() * 6) + 1),
      riskTier: ["Low", "Med", "High"][Math.floor(Math.random() * 3)],
      sensors,
    });
  }
}
seed();

app.get("/api/rooms", (req, res) => {
  res.json({ data: Array.from(rooms.values()) });
});

app.get("/api/rooms/:roomId/events", (req, res) => {
  const { roomId } = req.params;
  const list = events.filter((e) => e.roomId === roomId).slice(-200).reverse();
  res.json({ data: list });
});

app.post("/api/alerts/:alertId/ack", (req, res) => {
  const { alertId } = req.params;
  const { nurseId, notes } = req.body || {};
  const alert = alerts.get(alertId);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  if (!nurseId) return res.status(400).json({ error: "nurseId required" });

  const updated = {
    ...alert,
    status: "ACKED",
    ackedBy: nurseId,
    ackedAt: new Date().toISOString(),
    notes: notes || "",
  };
  alerts.set(alertId, updated);
  broadcast({ type: "alert.acked", payload: updated });
  res.json({ data: updated });
});

app.post("/api/ingest/event", (req, res) => {
  const evt = { id: crypto.randomUUID(), ts: new Date().toISOString(), ...req.body };
  if (!evt.roomId || !evt.type) return res.status(400).json({ error: "roomId and type required" });
  events.push(evt);

  const room = rooms.get(evt.roomId) || { id: evt.roomId, label: `Room ${evt.roomId}` };
  let status = room.status || "NORMAL";
  if (evt.type === "FALL_DETECTED") status = "CRITICAL";
  else if (evt.type === "INACTIVITY" && status !== "CRITICAL") status = "WARNING";
  else if (evt.type === "SENSOR_OFFLINE" && status !== "CRITICAL") status = "OFFLINE";
  else if (evt.type === "MOTION" && status === "WARNING") status = "NORMAL";

  const updatedRoom = { ...room, status, lastMovementAt: evt.ts };
  rooms.set(evt.roomId, updatedRoom);

  broadcast({ type: "event.created", payload: evt });
  broadcast({ type: "room.updated", payload: updatedRoom });

  if (evt.type === "FALL_DETECTED") {
    const alert = {
      id: crypto.randomUUID(),
      roomId: evt.roomId,
      eventId: evt.id,
      status: "ACTIVE",
      createdAt: evt.ts,
    };
    alerts.set(alert.id, alert);
    broadcast({ type: "alert.created", payload: alert });
  }

  res.json({ ok: true });
});

server.listen(3001, () => console.log("API running on http://localhost:3001"));
