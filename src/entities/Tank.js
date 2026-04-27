import * as THREE from 'three';
import { degToRad, clamp } from '../utils/MathUtils.js';
import { Bullet } from './Bullet.js';

const TANK_SIZE = 1.6;
const TANK_SPEED = 8;
const ROT_SPEED = 60;
const SHOOT_COOLDOWN = 0.3;
const MAX_HP = 100;

export class Tank {
  constructor(scene, x, z, color, playerId, name) {
    this.scene = scene;
    this.playerId = playerId;
    this.name = name;
    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.alive = true;
    this.score = 0;
    this.speed = TANK_SPEED;
    this.shootCooldown = SHOOT_COOLDOWN;
    this.lastShot = -SHOOT_COOLDOWN;
    this.respawnTimer = 0;
    this.respawnDelay = 2.0;
    this.hitFlash = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    scene.add(this.group);

    // 车身
    const bodyGeo = new THREE.BoxGeometry(TANK_SIZE, 1.0, TANK_SIZE * 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.7;
    this.body.castShadow = true;
    this.group.add(this.body);

    // 履带 (左)
    const trackGeo = new THREE.BoxGeometry(0.3, 0.5, TANK_SIZE * 0.8);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.trackL = new THREE.Mesh(trackGeo, trackMat);
    this.trackL.position.set(-TANK_SIZE / 2 - 0.1, 0.4, 0);
    this.trackL.castShadow = true;
    this.group.add(this.trackL);

    // 履带 (右)
    this.trackR = new THREE.Mesh(trackGeo, trackMat);
    this.trackR.position.set(TANK_SIZE / 2 + 0.1, 0.4, 0);
    this.trackR.castShadow = true;
    this.group.add(this.trackR);

    // 炮塔组 (可旋转)
    this.turretGroup = new THREE.Group();
    this.turretGroup.position.y = 1.3;
    this.group.add(this.turretGroup);

    // 炮塔本体
    const turretGeo = new THREE.BoxGeometry(TANK_SIZE * 0.6, 0.5, TANK_SIZE * 0.5);
    const turretMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
    this.turret = new THREE.Mesh(turretGeo, turretMat);
    this.turret.castShadow = true;
    this.turretGroup.add(this.turret);

    // 炮管
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.8 });
    this.barrel = new THREE.Mesh(barrelGeo, barrelMat);
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.z = 0.9;
    this.barrel.castShadow = true;
    this.turretGroup.add(this.barrel);

    // 血量条 (3D世界中的sprite)
    this.updateHpBar();
  }

  getPosition() {
    return this.group.position;
  }

  getRotation() {
    return this.group.rotation.y;
  }

  getAngleDeg() {
    return -this.group.rotation.y * 180 / Math.PI;
  }

  setAngleDeg(deg) {
    this.group.rotation.y = -degToRad(deg);
    this.turretGroup.rotation.y = 0;
  }

  getHitBox() {
    const p = this.group.position;
    const half = TANK_SIZE / 2 + 0.3;
    return {
      minX: p.x - half,
      maxX: p.x + half,
      minZ: p.z - half,
      maxZ: p.z + half
    };
  }

  move(forward, walls, otherTank, dt) {
    if (!this.alive) return;
    const dir = forward ? 1 : -1;
    const speed = (this.speed || TANK_SPEED) * dir * dt;
    const oldX = this.group.position.x;
    const oldZ = this.group.position.z;

    this.group.position.x += Math.sin(this.group.rotation.y) * speed;
    this.group.position.z += Math.cos(this.group.rotation.y) * speed;

    // 边界限制
    this.group.position.x = clamp(this.group.position.x, -55, 55);
    this.group.position.z = clamp(this.group.position.z, -55, 55);

    // 墙壁碰撞
    const myBox = this.getHitBox();
    for (const wall of walls) {
      if (wall.active && this.aabbHit(myBox, wall.getHitBox())) {
        this.group.position.x = oldX;
        this.group.position.z = oldZ;
        return;
      }
    }

    // 坦克碰撞
    if (otherTank && otherTank.alive && this.aabbHit(myBox, otherTank.getHitBox())) {
      this.group.position.x = oldX;
      this.group.position.z = oldZ;
    }
  }

  rotate(dir, dt) {
    if (!this.alive) return;
    this.group.rotation.y += dir * degToRad(ROT_SPEED) * dt;
  }

  shoot(now) {
    if (!this.alive) return null;
    if (now - this.lastShot < (this.shootCooldown || SHOOT_COOLDOWN)) return null;
    this.lastShot = now;
    const p = this.group.position;
    // 炮口方向与坦克一致
    const dir = this.group.rotation.y;
    const tipX = p.x + Math.sin(dir) * 1.5;
    const tipZ = p.z + Math.cos(dir) * 1.5;
    return new Bullet(this.scene, tipX, tipZ, dir, this.playerId);
  }

  takeDamage(damage) {
    this.hp -= damage;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnTimer = performance.now() / 1000;
      this.group.visible = false;
      return true;
    }
    return false;
  }

  respawn(spawnPoints, now) {
    if (this.alive) return;
    if (now - this.respawnTimer >= this.respawnDelay) {
      this.alive = true;
      this.hp = this.maxHp;
      const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      this.group.position.set(pt.x, 0, pt.z);
      this.setAngleDeg(Math.random() * 360);
      this.group.visible = true;
    }
  }

  update(dt) {
    if (!this.alive) return;

    // 受击闪烁
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const flash = Math.sin(this.hitFlash * 40) > 0;
      this.body.material.emissive.setHex(flash ? 0xffffff : 0x000000);
      this.turret.material.emissive.setHex(flash ? 0xffffff : 0x000000);
    } else {
      this.body.material.emissive.setHex(0x000000);
      this.turret.material.emissive.setHex(0x000000);
    }

    // 履带动画
    this.trackL.position.x = -TANK_SIZE / 2 - 0.1 + Math.sin(performance.now() * 0.01) * 0.02;
    this.trackR.position.x = TANK_SIZE / 2 + 0.1 + Math.sin(performance.now() * 0.01 + 1) * 0.02;
  }

  updateHpBar() {
    // 3D血量条用简单的缩放表示
    // 实际在HTML overlay中显示
  }

  aabbHit(a, b) {
    return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
  }

  destroy() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.group = null;
    }
  }
}
