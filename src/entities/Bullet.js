import * as THREE from 'three';

const BULLET_SPEED = 25;
const BULLET_SIZE = 0.3;

export class Bullet {
  constructor(scene, x, z, angle, owner) {
    this.scene = scene;
    this.owner = owner;
    this.active = true;
    this.life = 3.0;

    // 子弹方向与坦克前进方向一致
    this.vel = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(BULLET_SPEED);

    // 3D模型：发光球体
    const geometry = new THREE.SphereGeometry(BULLET_SIZE, 8, 8);
    const color = owner === 1 ? 0xffd700 : 0xff8c00;
    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 1, z);
    scene.add(this.mesh);

    // 拖尾光晕
    const glowGeo = new THREE.SphereGeometry(BULLET_SIZE * 2, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.glow.position.copy(this.mesh.position);
    scene.add(this.glow);
  }

  update(dt) {
    if (!this.active) return;
    this.mesh.position.addScaledVector(this.vel, dt);
    this.glow.position.copy(this.mesh.position);
    this.life -= dt;

    // 边界检查
    const p = this.mesh.position;
    if (Math.abs(p.x) > 60 || Math.abs(p.z) > 60 || this.life <= 0) {
      this.destroy();
    }
  }

  getPosition() {
    return this.mesh ? this.mesh.position : new THREE.Vector3(0, 0, 0);
  }

  getHitBox() {
    const p = this.mesh ? this.mesh.position : { x: 0, z: 0 };
    return { minX: p.x - 0.3, maxX: p.x + 0.3, minZ: p.z - 0.3, maxZ: p.z + 0.3 };
  }

  destroy() {
    this.active = false;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.glow) {
      this.scene.remove(this.glow);
      this.glow.geometry.dispose();
      this.glow.material.dispose();
      this.glow = null;
    }
  }
}
