#!/usr/bin/env node
// Lightweight log server with real-time view (in repo tools)
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const PORT = process.env.LOG_SERVER_PORT || 3001;
const LOG_FILE = process.env.LOG_FILE || path.join(process.cwd(), 'logs.log');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

// simple HTML viewer
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Online Logs</title>
    <style>
      body { font-family: system-ui, Arial; margin:10px; background:#0b0b0b; color:#fff;}
      .log { margin:0 0 6px 0; padding:6px; border-radius:4px; background:rgba(255,255,255,0.04);}
      .time { color:#999; margin-right:8px; }
      .level { font-weight:bold; margin-right:8px; }
    </style>
  </head>
  <body>
    <h1>Online Logs</h1>
    <div id="logs"></div>
    <script src="https://cdn.socket.io/4.7.1/socket.io.min.js"></script>
    <script>
      const socket = io();
      const logsDiv = document.getElementById('logs');
      socket.on('log', (obj) => {
        const d = document.createElement('div'); d.className='log';
        d.innerHTML = `<span class='time'>${obj.ts}</span><span class='level'>${obj.level}</span>${obj.message}<pre style='white-space:pre-wrap;color:#aaa;'>${JSON.stringify(obj.meta||{}, null, 2)}</pre>`;
        logsDiv.insertBefore(d, logsDiv.firstChild);
      });
    </script>
  </body>
  </html>`);
});

app.post('/logs', (req, res) => {
  const obj = req.body || {};
  obj.received = new Date().toISOString();
  // Append to file
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(obj) + '\n');
  } catch (e) { console.warn('Failed to append to log file', e); }
  // Emit via websocket
  io.emit('log', obj);
  res.status(200).json({ status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`Log server listening at http://localhost:${PORT}`);
  console.log(`Logs will be appended to ${LOG_FILE}`);
});
