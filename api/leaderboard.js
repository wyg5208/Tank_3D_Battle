import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const LEADERBOARD_KEY = 'tank_leaderboard';
const MAX_ENTRIES = 100;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — 获取排行榜 Top 50
  if (req.method === 'GET') {
    try {
      const results = await redis.zrange(LEADERBOARD_KEY, 0, 49, {
        rev: true,
        withScores: true,
      });

      const entries = [];
      for (let i = 0; i < results.length; i += 2) {
        const raw = results[i];
        const score = results[i + 1];
        try {
          const data = JSON.parse(raw);
          entries.push({ ...data, level: score });
        } catch {
          entries.push({ name: raw, level: score, date: '' });
        }
      }

      return res.status(200).json({ entries });
    } catch (err) {
      return res.status(500).json({ error: '获取排行榜失败' });
    }
  }

  // POST — 提交成绩 { name, level }
  if (req.method === 'POST') {
    try {
      const { name, level } = req.body || {};
      if (!name || !level) {
        return res.status(400).json({ error: '请提供 name 和 level' });
      }

      const safeName = String(name).trim().slice(0, 16);
      const safeLevel = Math.max(1, Math.min(999, Number(level)));

      const data = JSON.stringify({
        name: safeName,
        date: new Date().toISOString().slice(0, 10),
      });

      await redis.zadd(LEADERBOARD_KEY, {
        score: safeLevel,
        member: data,
      });

      // 只保留前 MAX_ENTRIES 名
      await redis.zremrangebyrank(LEADERBOARD_KEY, 0, -(MAX_ENTRIES + 1));

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: '保存失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
