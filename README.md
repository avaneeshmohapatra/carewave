# Fall Detection Dashboard

A real-time, high-density patient monitoring system designed for hospital wards and care facilities. This project provides real-time room tracking, emergency fall alerts, multi-sensor event timelines, and granular room diagnostics.

---

## Features

* **Real-Time Room Management:** Virtualized UI capable of rendering 100+ patient rooms smoothly, complete with status filtering (`NORMAL`, `WARNING`, `CRITICAL`, `OFFLINE`) and search.
* **Active Fall Alerts:** High-priority alert panel for `FALL_DETECTED` triggers with interactive caregiver acknowledgment logging.
* **Multi-Sensor Event Feed:** Live stream of incoming telemetry from `MOTION`, `BED_PRESSURE`, `DOOR`, `IMU`, and `CAMERA` sensors with calculated confidence scores.
* **Room Diagnostic Drawer:** In-depth forensic view providing historical logs, risk tier classification, and individual sensor health checks per room.
* **Dual Execution Modes:** Runs standalone in **Mock Mode** (client-side simulation) or connects seamlessly to a **Node.js Express + WebSocket** server.

---

## Tech Stack

* **Frontend:** React 18, HTML5/CSS3 (Native CSS Variables, Flexbox/Grid, Virtual Windowing)
* **Backend:** Node.js, Express, WebSockets (`ws`), CORS
* **Build Setup:** Zero-build frontend (served via ESM modules directly in the browser)

---

## Repository Structure

```text
.
├── index.html   # Standalone React dashboard interface
└── server.js    # Express REST API & WebSocket event server
```

---

## Quick Start

### 1. Standalone Mode (No Installation Required)

To run the dashboard using simulated data streams:

1. Open `index.html` in any browser, or serve it using a lightweight local web server:
   ```bash
   npx serve .
   ```
2. The UI will automatically run in **Mock Stream** mode, generating live synthetic events every ~1.8 seconds.

---

### 2. Live Backend Mode

To connect the interface to a running REST & WebSocket server:

#### Install & Start Server
```bash
# Initialize npm dependencies
npm init -y
npm install express cors ws

# Start the Node server
node server.js
```
* The server runs on `http://localhost:3001` with WebSockets active at `ws://localhost:3001/ws`.

#### Enable Backend in Frontend
Open `index.html`, find the configuration flag (around line 200), and update `USE_BACKEND` to `true`:

```javascript
const USE_BACKEND = true;
const API = "http://localhost:3001";
const WS_URL = "ws://localhost:3001/ws";
```

Reload `index.html` in your browser.

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rooms` | Fetch status and sensor health for all rooms |
| `GET` | `/api/rooms/:roomId/events` | Fetch event history for a specific room |
| `POST` | `/api/alerts/:alertId/ack` | Acknowledge an active fall alert |
| `POST` | `/api/ingest/event` | Ingest raw telemetry from hardware sensors |

### WebSocket Protocol

The backend streams real-time updates over `ws://localhost:3001/ws` with the following event structures:

* `room.updated` — Broadcasts status or movement time updates for a room.
* `event.created` — Broadcasts newly created sensor events across the facility.
* `alert.created` / `alert.acked` — Emitted when critical alerts are generated or acknowledged.
