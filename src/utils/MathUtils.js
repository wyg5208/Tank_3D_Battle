// 数学工具函数

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

export function angleDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

// AABB 碰撞检测
export function aabbIntersect(box1, box2) {
  return box1.minX < box2.maxX && box1.maxX > box2.minX &&
         box1.minZ < box2.maxZ && box1.maxZ > box2.minZ;
}

// 点是否在线段上（用于射线检测墙壁）
export function rayHitWall(ox, oz, dx, dz, walls) {
  const steps = Math.ceil(Math.hypot(dx - ox, dz - oz) / 2);
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(steps, 1);
    const cx = ox + (dx - ox) * t;
    const cz = oz + (dz - oz) * t;
    for (const wall of walls) {
      if (wall.active && wall.containsPoint(cx, cz)) return true;
    }
  }
  return false;
}
