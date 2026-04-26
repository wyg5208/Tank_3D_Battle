import * as THREE from 'three';

export class Wall {
  constructor(scene, x, z, wallType = 'brick') {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.size = 4; // 3D世界中的墙壁尺寸
    this.wallType = wallType;
    this.active = true;
    this.hp = wallType === 'brick' ? 40 : 9999;

    // 3D模型
    const geometry = new THREE.BoxGeometry(this.size, 3, this.size);
    let material;
    if (wallType === 'brick') {
      material = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9,
        metalness: 0.0
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.3,
        metalness: 0.8
      });
    }
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, 1.5, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // 顶部标识（砖块纹理暗示）
    if (wallType === 'brick') {
      const topGeo = new THREE.BoxGeometry(this.size * 0.9, 0.1, this.size * 0.9);
      const topMat = new THREE.MeshStandardMaterial({ color: 0xa0522d });
      this.top = new THREE.Mesh(topGeo, topMat);
      this.top.position.set(x, 3.05, z);
      scene.add(this.top);
    }
  }

  takeDamage(damage) {
    if (this.wallType !== 'brick') return false;
    this.hp -= damage;
    // 受击闪烁
    this.mesh.material.emissive.setHex(0xff4444);
    setTimeout(() => {
      if (this.mesh) this.mesh.material.emissive.setHex(0x000000);
    }, 100);
    if (this.hp <= 0) {
      this.destroy();
      return true; // 被摧毁
    }
    return false;
  }

  getHitBox() {
    const half = this.size / 2 + 0.2;
    return {
      minX: this.x - half,
      maxX: this.x + half,
      minZ: this.z - half,
      maxZ: this.z + half
    };
  }

  containsPoint(px, pz) {
    const half = this.size / 2;
    return px >= this.x - half && px <= this.x + half &&
           pz >= this.z - half && pz <= this.z + half;
  }

  destroy() {
    this.active = false;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.top) {
      this.scene.remove(this.top);
      this.top.geometry.dispose();
      this.top.material.dispose();
      this.top = null;
    }
  }
}
