import * as THREE from 'three';
import { randRange } from '../utils/MathUtils.js';

// 单个粒子
class Particle {
  constructor(pos, color, speed, life) {
    this.pos = pos.clone();
    const angle = randRange(0, Math.PI * 2);
    const phi = randRange(0, Math.PI);
    this.vel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(angle),
      Math.cos(phi) + 0.3,
      Math.sin(phi) * Math.sin(angle)
    ).multiplyScalar(speed * randRange(0.5, 1.5));
    this.life = life;
    this.maxLife = life;
    this.color = new THREE.Color(color);
    this.size = randRange(0.3, 0.8);
  }

  update(dt) {
    this.vel.y -= 9.8 * dt * 0.3; // 重力
    this.pos.addScaledVector(this.vel, dt);
    this.life -= dt;
    this.size = Math.max(0.05, this.size - dt * 0.5);
    return this.life > 0;
  }

  getAlpha() {
    return this.life / this.maxLife;
  }
}

// 爆炸效果
export class Explosion {
  constructor(scene, pos, size = 'small') {
    this.scene = scene;
    this.active = true;
    this.particles = [];
    this.mesh = null;

    const configs = {
      small:  { count: 12, speed: 4, life: 0.4, colors: [0xffd700, 0xff8c00, 0xffffff] },
      medium: { count: 25, speed: 5, life: 0.6, colors: [0x8b4513, 0xa0522d, 0x808080] },
      big:    { count: 50, speed: 7, life: 1.0, colors: [0xdc2626, 0xff8c00, 0xffd700, 0xffffff] }
    };
    const cfg = configs[size] || configs.small;

    for (let i = 0; i < cfg.count; i++) {
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
      this.particles.push(new Particle(pos, color, cfg.speed, cfg.life * randRange(0.7, 1.3)));
    }

    // 使用 Points 批量渲染粒子
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
    this.active = this.particles.length > 0;

    if (!this.active) {
      this.dispose();
      return;
    }

    // 更新 Points 几何体
    const positions = [];
    const colors = [];
    for (const p of this.particles) {
      positions.push(p.pos.x, p.pos.y, p.pos.z);
      const alpha = p.getAlpha();
      colors.push(p.color.r * alpha, p.color.g * alpha, p.color.b * alpha);
    }
    this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}
