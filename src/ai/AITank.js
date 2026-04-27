import { Tank } from '../entities/Tank.js';
import { angleDiff, rayHitWall } from '../utils/MathUtils.js';

// ============================================================
// 难度配置：通过数学公式平滑计算，随关卡递增
// 优化：低关卡大幅提升攻击性，确保从 L1 起就会主动射击
// ============================================================
export function getDifficultyConfig(level) {
  const L = level;
  return {
    // 反应间隔：早期 0.06s 极快，后期 0.04s
    thinkInterval: Math.max(0.04, 0.10 - (L - 1) * 0.003),
    // 瞄准容差：早期 30° 非常宽松，后期精准到 2°
    aimTolerance:  Math.max(2,    30   - (L - 1) * 1.3),
    // 射击距离：早期必须靠近才射击（25），随关卡稳步增大
    shootRange:    Math.min(80,   25   + (L - 1) * 2.8),
    // 闪避范围
    dodgeRange:    Math.min(28,   10   + (L - 1) * 0.9),
    // 速度
    speed:         Math.min(14,    8   + (L - 1) * 0.35),
    // 血量
    hp:            Math.min(280, 100   + (L - 1) * 9),
    // 射击冷却
    shootCooldown: Math.max(0.08, 0.42 - (L - 1) * 0.018),
    // 复活延迟
    respawnDelay:  Math.max(0.70, 2.8  - (L - 1) * 0.12),
    // 行为解锁阈值
    canPredictAim: L >= 3,
    canSeekCover:  L >= 5,
    canFlank:      L >= 6,
    canRetreat:    L >= 8,
  };
}

// ============================================================
// AI 坦克：继承 Tank，逐级解锁战术行为
// ============================================================
export class AITank extends Tank {
  constructor(scene, x, z, color, playerId, name, level = 1) {
    super(scene, x, z, color, playerId, name);

    this.level = level;
    const cfg = getDifficultyConfig(level);
    this.cfg = cfg;

    // 覆盖基类属性
    this.speed = cfg.speed;
    this.shootCooldown = cfg.shootCooldown;
    this.respawnDelay = cfg.respawnDelay;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;

    // 内部定时器与状态
    this.aiTimer = 0;
    this.moveForward = true;
    this.rotateDir = 0;
    this.wantsShoot = false;
    this.stuckTimer = 0;
    this.lastPos = { x, z };

    // 预判瞄准
    this.lastTargetPos = null;
    this.targetVelocity = { x: 0, z: 0 };
  }

  // ==========================================================
  //  主思考入口（每帧由 Game.update 调用）
  // ==========================================================
  think(target, walls, bullets, dt) {
    if (!this.alive || !target || !target.alive) return;

    const cfg = this.cfg;
    this.aiTimer += dt;
    if (this.aiTimer < cfg.thinkInterval) return;
    this.aiTimer = 0;

    // ---- 目标速度估算 ----
    const tp = target.getPosition();
    if (this.lastTargetPos) {
      const tdt = Math.max(dt, 0.016);
      this.targetVelocity.x = (tp.x - this.lastTargetPos.x) / tdt;
      this.targetVelocity.z = (tp.z - this.lastTargetPos.z) / tdt;
    }
    this.lastTargetPos = { x: tp.x, z: tp.z };

    const mx = this.getPosition().x;
    const mz = this.getPosition().z;
    const dist = Math.hypot(tp.x - mx, tp.z - mz);

    // ---- 1. 卡住检测 ----
    const dxMoved = mx - this.lastPos.x;
    const dzMoved = mz - this.lastPos.z;
    if (dxMoved * dxMoved + dzMoved * dzMoved < 0.004) {
      this.stuckTimer++;
    } else {
      this.stuckTimer = 0;
    }
    this.lastPos = { x: mx, z: mz };

    if (this.stuckTimer > 18) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
      this.moveForward = true;
      if (this.stuckTimer > 35) this.stuckTimer = 0;
      this.doShoot(tp, walls, mx, mz, dist);
      return;
    }

    // ---- 2. 残血撤退（L8+，仅在血量极低时） ----
    if (cfg.canRetreat && this.hp < this.maxHp * 0.28) {
      this.doRetreat(tp, mx, mz, walls);
      this.doShoot(tp, walls, mx, mz, dist);
      return;
    }

    // ---- 3. 躲避子弹 ----
    if (this.dodgeBullets(bullets, cfg)) {
      this.moveForward = true;
      this.doShoot(tp, walls, mx, mz, dist);
      return;
    }

    // ---- 4. 掩体寻找（L5+，低概率） ----
    if (cfg.canSeekCover && Math.random() < 0.15) {
      this.doCoverSeek(tp, walls, mx, mz);
      this.doShoot(tp, walls, mx, mz, dist);
      return;
    }

    // ---- 5. 迂回包抄（L6+，低概率） ----
    if (cfg.canFlank && Math.random() < 0.15 && dist < 35) {
      this.doFlank(tp, mx, mz, walls);
      this.doShoot(tp, walls, mx, mz, dist);
      return;
    }

    // ---- 6. 默认：追踪 + 射击 ----
    this.doChase(tp, mx, mz, walls);
    this.doShoot(tp, walls, mx, mz, dist);
  }

  // ==========================================================
  //  行为：追踪 —— 简化版，主动逼近，不保持"最佳距离"
  // ==========================================================
  doChase(tp, mx, mz, walls) {
    const cfg = this.cfg;
    const dist = Math.hypot(tp.x - mx, tp.z - mz);

    // 始终瞄准目标
    const targetAngle = Math.atan2(mz - tp.z, tp.x - mx) * 180 / Math.PI;
    const myAngle = this.getAngleDeg();
    const diff = angleDiff(targetAngle, myAngle);

    if (Math.abs(diff) > 3) {
      this.rotateDir = diff > 0 ? 1 : -1;
    } else {
      this.rotateDir = 0;
    }

    // 主动逼近：只要目标在射击范围外或距离较远就前进
    if (dist > cfg.shootRange * 0.7) {
      this.moveForward = true;
    } else if (dist < 6) {
      // 贴身了才退
      this.moveForward = false;
    } else {
      // 在射击范围内，80%概率前进施压
      this.moveForward = Math.random() < 0.8;
    }

    // 前方有墙 → 转向绕过
    if (this.wallAhead(walls)) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
      this.moveForward = true;
    }
  }

  // ==========================================================
  //  行为：残血撤退
  // ==========================================================
  doRetreat(tp, mx, mz, walls) {
    const retreatAngle = Math.atan2(mz - tp.z, tp.x - mx) * 180 / Math.PI;
    const backAngle = ((retreatAngle + 180) % 360 + 360) % 360;
    const myAngle = this.getAngleDeg();
    const diff = angleDiff(backAngle, myAngle);

    this.rotateDir = diff > 0 ? 1 : -1;
    this.moveForward = true;

    if (this.wallAhead(walls)) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
    }
  }

  // ==========================================================
  //  行为：掩体寻找
  // ==========================================================
  doCoverSeek(tp, walls, mx, mz) {
    let bestWall = null;
    let bestScore = Infinity;

    for (const wall of walls) {
      if (!wall.active) continue;
      const wx = wall.x;
      const wz = wall.z;
      const wallToMe = Math.hypot(wx - mx, wz - mz);
      const wallToTarget = Math.hypot(wx - tp.x, wz - tp.z);
      const score = wallToMe * 1.0 + wallToTarget * 0.3;
      if (score < bestScore && wallToMe < 22) {
        bestScore = score;
        bestWall = wall;
      }
    }

    if (bestWall) {
      const wx = bestWall.x;
      const wz = bestWall.z;
      const coverAngle = Math.atan2(mz - wz, wx - mx) * 180 / Math.PI;
      const myAngle = this.getAngleDeg();
      const diff = angleDiff(coverAngle, myAngle);
      this.rotateDir = diff > 0 ? 1 : -1;
      this.moveForward = true;
    } else {
      this.doChase(tp, mx, mz, walls);
    }
  }

  // ==========================================================
  //  行为：迂回包抄
  // ==========================================================
  doFlank(tp, mx, mz, walls) {
    const toTarget = Math.atan2(mz - tp.z, tp.x - mx);
    const side = Math.random() > 0.5 ? 1 : -1;
    const flankAngle = (toTarget + side * Math.PI / 2) * 180 / Math.PI;
    const myAngle = this.getAngleDeg();
    const diff = angleDiff(flankAngle, myAngle);

    if (Math.abs(diff) > 6) {
      this.rotateDir = diff > 0 ? 1 : -1;
    } else {
      this.rotateDir = 0;
    }
    this.moveForward = true;

    if (this.wallAhead(walls)) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
    }
  }

  // ==========================================================
  //  射击判定：大幅放宽条件，确保低关卡也会频繁开火
  // ==========================================================
  doShoot(tp, walls, mx, mz, dist) {
    const cfg = this.cfg;
    if (dist > cfg.shootRange) {
      this.wantsShoot = false;
      return;
    }

    // 预判瞄准（L3+）
    let aimX = tp.x;
    let aimZ = tp.z;
    if (cfg.canPredictAim && this.targetVelocity) {
      const predictFactor = Math.min(2.0, dist / 20);
      aimX = tp.x + this.targetVelocity.x * predictFactor;
      aimZ = tp.z + this.targetVelocity.z * predictFactor;
    }

    const targetAngle = Math.atan2(mz - aimZ, aimX - mx) * 180 / Math.PI;
    const myAngle = this.getAngleDeg();
    const diff = Math.abs(angleDiff(targetAngle, myAngle));

    // aimTolerance 对于低关卡非常宽松（30°），确保 AI 即使没完全瞄准也能开火
    if (diff < cfg.aimTolerance) {
      if (!rayHitWall(mx, mz, aimX, aimZ, walls)) {
        this.wantsShoot = true;
      } else {
        this.wantsShoot = false;
      }
    } else {
      // 即使没瞄准好，只要目标在面前半屏范围内就保持射击意图
      // （等待旋转到位，减少"放弃射击→重新瞄准"的来回切换）
      this.wantsShoot = false;
    }
  }

  // ==========================================================
  //  躲避子弹
  // ==========================================================
  dodgeBullets(bullets, cfg) {
    const mx = this.getPosition().x;
    const mz = this.getPosition().z;
    for (const b of bullets) {
      if (!b.active || b.owner === this.playerId) continue;
      const bx = b.getPosition().x;
      const bz = b.getPosition().z;
      const dist = Math.hypot(bx - mx, bz - mz);
      if (dist > cfg.dodgeRange) continue;
      const bulletDir = Math.atan2(-b.vel.z, b.vel.x) * 180 / Math.PI;
      const toAi = Math.atan2(mz - bz, mx - bx) * 180 / Math.PI;
      const ad = Math.abs(angleDiff(bulletDir, toAi));
      if (ad < 30) return true;
    }
    return false;
  }

  // ==========================================================
  //  前方墙壁检测
  // ==========================================================
  wallAhead(walls) {
    const mx = this.getPosition().x;
    const mz = this.getPosition().z;
    const rad = degToRad(this.getAngleDeg());
    const lookAhead = 3.2 + (this.level || 1) * 0.18;
    const fx = mx + Math.cos(rad) * lookAhead;
    const fz = mz - Math.sin(rad) * lookAhead;
    for (const wall of walls) {
      if (wall.active && wall.containsPoint(fx, fz)) return true;
    }
    return false;
  }

  // ==========================================================
  //  每帧执行 AI 动作
  // ==========================================================
  aiUpdate(walls, otherTank, now, dt) {
    if (!this.alive) return null;
    if (this.rotateDir !== 0) this.rotate(this.rotateDir, dt);
    if (this.moveForward || this.rotateDir !== 0) {
      this.move(this.moveForward, walls, otherTank, dt);
    }
    if (this.wantsShoot) {
      const b = this.shoot(now);
      if (b) {
        this.wantsShoot = false;
        return b;
      }
    }
    return null;
  }
}

// ============================================================
//  工具函数
// ============================================================
function degToRad(deg) {
  return deg * Math.PI / 180;
}
