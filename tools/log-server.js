import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/logs', (req, res) => {
  const { level, message, meta, ts } = req.body || {};
  const time = ts || new Date().toISOString();
  console.log(`[${time}] [${level || 'info'}] ${message || ''}`, meta || {});
  res.status(200).json({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Log server running on http://localhost:${port}`));
