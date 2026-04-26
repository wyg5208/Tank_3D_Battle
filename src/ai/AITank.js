import { Tank } from '../entities/Tank.js';
import { angleDiff, rayHitWall } from '../utils/MathUtils.js';

export class AITank extends Tank {
  constructor(scene, x, z, color, playerId, name) {
    super(scene, x, z, color, playerId, name);
    this.aiTimer = 0;
    this.aiInterval = 0.1; // 秒
    this.moveForward = true;
    this.rotateDir = 0;
    this.wantsShoot = false;
    this.stuckTimer = 0;
    this.lastPos = { x, z };
  }

  think(target, walls, bullets, dt) {
    if (!this.alive || !target || !target.alive) return;

    this.aiTimer += dt;
    if (this.aiTimer < this.aiInterval) return;
    this.aiTimer = 0;

    // 卡住检测
    const dx = this.group.position.x - this.lastPos.x;
    const dz = this.group.position.z - this.lastPos.z;
    if (dx * dx + dz * dz < 0.01) {
      this.stuckTimer++;
    } else {
      this.stuckTimer = 0;
    }
    this.lastPos = { x: this.group.position.x, z: this.group.position.z };

    if (this.stuckTimer > 20) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
      this.moveForward = true;
      if (this.stuckTimer > 40) this.stuckTimer = 0;
      return;
    }

    // 躲避子弹
    const dodge = this.findDangerousBullet(bullets);
    if (dodge) {
      this.moveForward = true;
      return;
    }

    // 追踪目标
    const tx = target.getPosition().x;
    const tz = target.getPosition().z;
    const mx = this.getPosition().x;
    const mz = this.getPosition().z;

    const targetAngle = Math.atan2(mz - tz, tx - mx) * 180 / Math.PI;
    const myAngle = this.getAngleDeg();
    const diff = angleDiff(targetAngle, myAngle);
    const dist = Math.hypot(tx - mx, tz - mz);

    // 旋转
    if (Math.abs(diff) > 8) {
      this.rotateDir = diff > 0 ? 1 : -1;
    } else {
      this.rotateDir = 0;
    }

    // 移动
    if (dist > 25) {
      this.moveForward = true;
    } else if (dist < 15) {
      this.moveForward = false;
    } else {
      this.moveForward = Math.random() > 0.4;
    }

    // 避障
    if (this.wallAhead(walls)) {
      this.rotateDir = Math.random() > 0.5 ? 1 : -1;
      this.moveForward = true;
    }

    // 射击
    if (Math.abs(diff) < 8 && dist < 50) {
      if (!rayHitWall(mx, mz, tx, tz, walls)) {
        this.wantsShoot = true;
      } else {
        this.wantsShoot = false;
      }
    } else {
      this.wantsShoot = false;
    }
  }

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

  findDangerousBullet(bullets) {
    const mx = this.getPosition().x;
    const mz = this.getPosition().z;
    for (const b of bullets) {
      if (!b.active || b.owner === this.playerId) continue;
      const bx = b.getPosition().x;
      const bz = b.getPosition().z;
      const dist = Math.hypot(bx - mx, bz - mz);
      if (dist > 15) continue;
      const bulletDir = Math.atan2(-b.vel.z, b.vel.x) * 180 / Math.PI;
      const toAi = Math.atan2(mz - bz, mx - bx) * 180 / Math.PI;
      const ad = Math.abs(angleDiff(bulletDir, toAi));
      if (ad < 30) return true;
    }
    return false;
  }

  wallAhead(walls) {
    const mx = this.getPosition().x;
    const mz = this.getPosition().z;
    const rad = degToRad(this.getAngleDeg());
    const fx = mx + Math.cos(rad) * 4;
    const fz = mz - Math.sin(rad) * 4;
    for (const wall of walls) {
      if (wall.active && wall.containsPoint(fx, fz)) return true;
    }
    return false;
  }
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}
