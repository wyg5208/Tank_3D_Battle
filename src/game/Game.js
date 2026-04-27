import * as THREE from 'three';
import { Tank } from '../entities/Tank.js';
import { AITank } from '../ai/AITank.js';
import { Wall } from '../entities/Wall.js';
import { Explosion } from '../entities/ParticleSystem.js';
import { aabbIntersect } from '../utils/MathUtils.js';
import { AudioManager } from './AudioManager.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const WIN_SCORE = 10;
const MAP_SIZE = 60;

// 场景主题预设
const THEMES = [
  {
    name: '明亮',
    bg: 0x3a3a3a, fog: 0x3a3a3a, fogNear: 80, fogFar: 200,
    ambient: 0xdddddd, ambientInt: 3.5,
    hemiSky: 0x87ceeb, hemiGrnd: 0x8b6914, hemiInt: 2.5,
    dirCol: 0xffffff, dirInt: 5.0,
    fillCol: 0xaaaaff, fillInt: 2.5,
    ground: 0x5a5a5a
  },
  {
    name: '均衡',
    bg: 0x2a2a2a, fog: 0x2a2a2a, fogNear: 70, fogFar: 180,
    ambient: 0xcccccc, ambientInt: 3.0,
    hemiSky: 0x87ceeb, hemiGrnd: 0x8b6914, hemiInt: 2.0,
    dirCol: 0xffffff, dirInt: 4.5,
    fillCol: 0xaaaaff, fillInt: 2.0,
    ground: 0x4a4a4a
  },
  {
    name: '黄昏',
    bg: 0x3a2a30, fog: 0x3a2a30, fogNear: 60, fogFar: 160,
    ambient: 0x886644, ambientInt: 2.5,
    hemiSky: 0xcc8844, hemiGrnd: 0x664422, hemiInt: 1.8,
    dirCol: 0xff9944, dirInt: 3.5,
    fillCol: 0x886688, fillInt: 1.5,
    ground: 0x3a2a18
  },
  {
    name: '暗夜',
    bg: 0x1a1a28, fog: 0x1a1a28, fogNear: 45, fogFar: 140,
    ambient: 0x444488, ambientInt: 1.8,
    hemiSky: 0x4444aa, hemiGrnd: 0x222244, hemiInt: 1.0,
    dirCol: 0x6688cc, dirInt: 2.5,
    fillCol: 0x444488, fillInt: 1.0,
    ground: 0x1a1a22
  }
];

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);
    this.scene.fog = new THREE.Fog(0x2a2a2a, 30, 120);

    // 相机
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    const initScale = this.getPortraitScale();
    this.camera.position.set(0, 60 * initScale, 50 * initScale);
    this.camera.lookAt(0, 0, 0);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // 轨道控制器（PC端鼠标旋转视角）
    this.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 10;
    this.controls.maxDistance = 120;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
    this.controls.enabled = true;
    this.controls.update();

    // 灯光 / 地面（需要可被主题系统引用）
    this.lightRefs = {};
    this.groundMat = null;
    this.sceneThemeIndex = 0;
    this.sceneThemeName = '明亮';
    this.setupLights();
    this.setupGround();

    // 音频
    this.audio = new AudioManager();

    // 状态
    this.gameMode = 'pvp';
    this.gameState = 'menu'; // menu, playing, gameover
    this.tank1 = null;
    this.tank2 = null;
    this.walls = [];
    this.bullets = [];
    this.explosions = [];
    this.winner = null;
    this.winSoundPlayed = false;
    this.cameraMode = 'default'; // 'default' | 'fpv' | 'split'
    this.currentPreset = 2;
    this.fpvCamera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
    this.spawnPoints = [
      { x: -26, z: -26 }, { x: 26, z: 26 },
      { x: -26, z: 26 }, { x: 26, z: -26 }
    ];

    // 窗口大小调整
    window.addEventListener('resize', () => this.onResize());

    // 应用默认主题（明亮）
    this.applyTheme(0);
  }

  setupLights() {
    // 环境光
    const ambient = new THREE.AmbientLight(0xcccccc, 1.2);
    this.scene.add(ambient);
    this.lightRefs.ambient = ambient;

    // 半球光（增加天光感）
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.8);
    this.scene.add(hemi);
    this.lightRefs.hemi = hemi;

    // 主方向光
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(30, 50, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 150;
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -60;
    this.scene.add(dir);
    this.lightRefs.dir = dir;

    // 补光（从背面）
    const fill = new THREE.DirectionalLight(0xaaaaff, 0.8);
    fill.position.set(-30, 40, -30);
    this.scene.add(fill);
    this.lightRefs.fill = fill;
  }

  setupGround() {
    const geo = new THREE.PlaneGeometry(120, 120);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 });
    this.groundMat = mat;
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 网格线
    const grid = new THREE.GridHelper(120, 30, 0x333333, 0x222222);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  createMap() {
    this.walls.forEach(w => w.destroy());
    this.walls = [];

    // 边界钢墙
    const wallSize = 4;
    const halfMap = MAP_SIZE / 2;
    for (let x = -halfMap; x <= halfMap; x += wallSize) {
      this.walls.push(new Wall(this.scene, x, -halfMap, 'steel'));
      this.walls.push(new Wall(this.scene, x, halfMap, 'steel'));
    }
    for (let z = -halfMap + wallSize; z < halfMap; z += wallSize) {
      this.walls.push(new Wall(this.scene, -halfMap, z, 'steel'));
      this.walls.push(new Wall(this.scene, halfMap, z, 'steel'));
    }

    // 随机砖块
    const margin = 12;
    for (let i = 0; i < 30; i++) {
      const x = Math.floor((Math.random() * (MAP_SIZE - margin * 2) - (MAP_SIZE / 2 - margin)) / wallSize) * wallSize;
      const z = Math.floor((Math.random() * (MAP_SIZE - margin * 2) - (MAP_SIZE / 2 - margin)) / wallSize) * wallSize;
      // 避开出生点
      const nearSpawn = this.spawnPoints.some(p => Math.abs(p.x - x) < 10 && Math.abs(p.z - z) < 10);
      if (!nearSpawn) {
        this.walls.push(new Wall(this.scene, x, z, 'brick'));
      }
    }

    // 中央掩体
    for (let dx = -wallSize; dx <= wallSize; dx += wallSize) {
      for (let dz = -wallSize; dz <= wallSize; dz += wallSize) {
        if (dx === 0 && dz === 0) continue;
        this.walls.push(new Wall(this.scene, dx, dz, 'brick'));
      }
    }
  }

  start(mode) {
    this.gameMode = mode;
    this.gameState = 'playing';
    this.winner = null;
    this.winSoundPlayed = false;

    // 清理旧对象
    this.cleanup();

    // 创建坦克
    this.tank1 = new Tank(this.scene, -26, -26, 0x22c55e, 1, '玩家1');
    this.tank1.setAngleDeg(45);
    if (mode === 'pve') {
      this.tank2 = new AITank(this.scene, 26, 26, 0x3b82f6, 2, '电脑');
    } else {
      this.tank2 = new Tank(this.scene, 26, 26, 0xdc2626, 2, '玩家2');
    }
    this.tank2.setAngleDeg(225);

    this.createMap();
    this.bullets = [];
    this.explosions = [];
    this.audio.resume();
  }

  cleanup() {
    if (this.tank1) { this.tank1.destroy(); this.tank1 = null; }
    if (this.tank2) { this.tank2.destroy(); this.tank2 = null; }
    this.walls.forEach(w => w.destroy());
    this.walls = [];
    this.bullets.forEach(b => b.destroy());
    this.bullets = [];
    this.explosions.forEach(e => e.dispose());
    this.explosions = [];
  }

  update(dt, input) {
    if (this.gameState !== 'playing') return;
    const now = performance.now() / 1000;

    // 玩家1控制
    if (this.tank1.alive) {
      if (input.p1Forward()) this.tank1.move(true, this.walls, this.tank2, dt);
      if (input.p1Backward()) this.tank1.move(false, this.walls, this.tank2, dt);
      if (input.p1Left()) this.tank1.rotate(1, dt);
      if (input.p1Right()) this.tank1.rotate(-1, dt);
      if (input.p1Shoot()) {
        const b = this.tank1.shoot(now);
        if (b) {
          this.bullets.push(b);
          this.audio.playShoot();
        }
      }
    }

    // 玩家2控制（仅PVP）
    if (this.gameMode === 'pvp' && this.tank2.alive) {
      if (input.p2Forward()) this.tank2.move(true, this.walls, this.tank1, dt);
      if (input.p2Backward()) this.tank2.move(false, this.walls, this.tank1, dt);
      if (input.p2Left()) this.tank2.rotate(1, dt);
      if (input.p2Right()) this.tank2.rotate(-1, dt);
      if (input.p2Shoot()) {
        const b = this.tank2.shoot(now);
        if (b) {
          this.bullets.push(b);
          this.audio.playShoot();
        }
      }
    }

    // AI控制
    if (this.gameMode === 'pve' && this.tank2 instanceof AITank) {
      this.tank2.think(this.tank1, this.walls, this.bullets, dt);
      const b = this.tank2.aiUpdate(this.walls, this.tank1, now, dt);
      if (b) {
        this.bullets.push(b);
        this.audio.playShoot();
      }
    }

    // 复活
    this.tank1.respawn(this.spawnPoints, now);
    this.tank2.respawn(this.spawnPoints, now);

    // 更新坦克
    this.tank1.update(dt);
    this.tank2.update(dt);

    // 更新子弹和碰撞
    this.updateBullets(dt);

    // 更新爆炸
    this.explosions.forEach(e => e.update(dt));
    this.explosions = this.explosions.filter(e => e.active);

    // 获胜检查
    if (this.tank1.score >= WIN_SCORE || this.tank2.score >= WIN_SCORE) {
      this.gameState = 'gameover';
      this.winner = this.tank1.score >= WIN_SCORE
        ? { name: this.tank1.name, color: '#22c55e' }
        : { name: this.tank2.name, color: this.gameMode === 'pve' ? '#3b82f6' : '#dc2626' };
    }

    if (this.gameState === 'gameover' && !this.winSoundPlayed) {
      this.winSoundPlayed = true;
      this.audio.playWin();
    }
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) {
      bullet.update(dt);
      if (!bullet.active) continue;

      const bBox = bullet.getHitBox();

      // 子弹 vs 墙壁
      for (const wall of this.walls) {
        if (!wall.active) continue;
        if (aabbIntersect(bBox, wall.getHitBox())) {
          const pos = bullet.getPosition().clone();
          bullet.destroy();
          const destroyed = wall.takeDamage(20);
          this.explosions.push(new Explosion(this.scene, pos, 'small'));
          if (destroyed) {
            this.explosions.push(new Explosion(this.scene, new THREE.Vector3(wall.x, 2, wall.z), 'medium'));
            this.audio.playExplosion();
          } else {
            this.audio.playHit();
          }
          break;
        }
      }
      if (!bullet.active) continue;

      // 子弹 vs tank1
      if (bullet.owner !== this.tank1.playerId && this.tank1.alive) {
        if (aabbIntersect(bBox, this.tank1.getHitBox())) {
          const pos = bullet.getPosition().clone();
          bullet.destroy();
          this.explosions.push(new Explosion(this.scene, pos, 'small'));
          this.audio.playHit();
          const killed = this.tank1.takeDamage(20);
          if (killed) {
            this.explosions.push(new Explosion(this.scene, this.tank1.getPosition().clone().add(new THREE.Vector3(0, 1, 0)), 'big'));
            this.audio.playExplosion();
            this.tank2.score++;
          }
        }
      }
      if (!bullet.active) continue;

      // 子弹 vs tank2
      if (bullet.owner !== this.tank2.playerId && this.tank2.alive) {
        if (aabbIntersect(bBox, this.tank2.getHitBox())) {
          const pos = bullet.getPosition().clone();
          bullet.destroy();
          this.explosions.push(new Explosion(this.scene, pos, 'small'));
          this.audio.playHit();
          const killed = this.tank2.takeDamage(20);
          if (killed) {
            this.explosions.push(new Explosion(this.scene, this.tank2.getPosition().clone().add(new THREE.Vector3(0, 1, 0)), 'big'));
            this.audio.playExplosion();
            this.tank1.score++;
          }
        }
      }
    }

    // 清理已销毁子弹
    this.bullets = this.bullets.filter(b => b.active);
  }

  render() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (this.cameraMode === 'split' && this.gameMode === 'pvp' && this.tank1 && this.tank2 && this.tank1.alive && this.tank2.alive) {
      // ===== 分屏模式（上下分割，第一人称） =====
      const halfH = Math.floor(h / 2);

      // 上半：玩家1 第一人称
      this.renderer.setViewport(0, 0, w, halfH);
      this.renderer.setScissor(0, 0, w, halfH);
      this.renderer.setScissorTest(true);
      this.updateFPVCamera(this.tank1, this.camera, w, halfH);
      this.renderer.render(this.scene, this.camera);

      // 下半：玩家2 第一人称（180°反转视角）
      this.renderer.setViewport(0, halfH, w, h - halfH);
      this.renderer.setScissor(0, halfH, w, h - halfH);
      this.renderer.setScissorTest(true);
      this.updateFPVCamera(this.tank2, this.fpvCamera, w, h - halfH);
      this.renderer.render(this.scene, this.fpvCamera);
      this.drawMinimap();

      // 重置
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
    } else if (this.cameraMode === 'fpv' && this.tank1 && this.tank1.alive) {
      // ===== 第一人称 =====
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
      this.updateFPVCamera(this.tank1, this.camera, w, h);
      this.renderer.render(this.scene, this.camera);
      this.drawMinimap();
    } else {
      // ===== 默认/俯视视角 =====
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissorTest(false);
      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** 更新FPV相机位置 */
  updateFPVCamera(tank, camera, viewW, viewH) {
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();

    const pos = tank.getPosition();
    const angle = tank.getRotation();
    const height = 2.2; // 炮塔上方

    // 相机放在炮塔上方，略微靠前
    camera.position.set(
      pos.x + Math.sin(angle) * 0.8,
      height,
      pos.z + Math.cos(angle) * 0.8
    );

    // 看向坦克前方20单位
    camera.lookAt(
      pos.x + Math.sin(angle) * 20,
      1.0,
      pos.z + Math.cos(angle) * 20
    );
  }

  /** 切换场景主题 */
  cycleTheme() {
    this.sceneThemeIndex = (this.sceneThemeIndex + 1) % THEMES.length;
    this.applyTheme(this.sceneThemeIndex);
    return THEMES[this.sceneThemeIndex].name;
  }

  /** 应用场景主题 */
  applyTheme(index) {
    const t = THEMES[index];
    if (!t) return;

    this.sceneThemeName = t.name;

    // 场景背景 & 雾
    this.scene.background.setHex(t.bg);
    this.scene.fog.color.setHex(t.fog);
    this.scene.fog.near = t.fogNear;
    this.scene.fog.far = t.fogFar;

    // 灯光
    this.lightRefs.ambient.color.setHex(t.ambient);
    this.lightRefs.ambient.intensity = t.ambientInt;
    this.lightRefs.hemi.color.setHex(t.hemiSky);
    this.lightRefs.hemi.groundColor.setHex(t.hemiGrnd);
    this.lightRefs.hemi.intensity = t.hemiInt;
    this.lightRefs.dir.color.setHex(t.dirCol);
    this.lightRefs.dir.intensity = t.dirInt;
    this.lightRefs.fill.color.setHex(t.fillCol);
    this.lightRefs.fill.intensity = t.fillInt;

    // 地面
    if (this.groundMat) this.groundMat.color.setHex(t.ground);
  }

  /** 竖屏时自动拉远相机，确保看到完整地图 */
  getPortraitScale() {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect >= 1) return 1;
    // 竖屏比例越窄，缩放越大
    return Math.min(2.0, Math.max(1.3, 0.85 / aspect));
  }

  /** 切换相机视角 */
  setCameraPreset(preset) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);

    if (preset === 'fpv') {
      this.cameraMode = 'fpv';
      document.body.classList.add('fpv-mode');
      if (this.controls) this.controls.enabled = false;
      return;
    }
    if (preset === 'split') {
      this.cameraMode = this.gameMode === 'pvp' ? 'split' : 'fpv';
      document.body.classList.add('fpv-mode');
      if (this.controls) this.controls.enabled = false;
      return;
    }

    // 俯瞰预设视角
    document.body.classList.remove('fpv-mode');
    this.cameraMode = 'default';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const presets = {
      1: { pos: [0, 70, 0.1], target: [0, 0, 0] },
      2: { pos: [0, 60, 50], target: [0, 0, 0] },
      3: { pos: [0, 25, 35], target: [0, 0, 0] }
    };
    const p = presets[preset] || presets[2];
    this.currentPreset = preset;

    // 竖屏时拉远相机以显示更宽的地图范围
    const scale = this.getPortraitScale();
    let camX, camY, camZ;
    if (scale > 1) {
      camX = 0; camY = p.pos[1] * scale; camZ = p.pos[2] * scale;
    } else {
      [camX, camY, camZ] = p.pos;
    }
    this.camera.position.set(camX, camY, camZ);
    // 同步 OrbitControls
    if (this.controls) {
      this.controls.target.set(...p.target);
      this.controls.enabled = true;
      this.controls.update();
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fpvCamera.aspect = w / h;
    this.fpvCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    // 横竖屏切换时重新应用当前预设以适配缩放
    if (this.cameraMode === 'default' && this.currentPreset) {
      this.setCameraPreset(this.currentPreset);
    }
  }

  /** 绘制微缩地图（第一人称视角） */
  drawMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 80;
    const halfMap = 30;
    const scale = size / (halfMap * 2);

    const toCanvas = (wx, wz) => ({
      x: size - (wx + halfMap) * scale,
      y: size - (wz + halfMap) * scale
    });

    ctx.clearRect(0, 0, size, size);

    // 背景（80%透明）
    ctx.fillStyle = 'rgba(10, 10, 20, 0.2)';
    ctx.fillRect(0, 0, size, size);

    // 地图边界
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    // 网格线（去掉，小尺寸下太密）
    // 墙壁
    ctx.fillStyle = 'rgba(200, 200, 200, 0.12)';
    for (const wall of this.walls) {
      if (!wall.active) continue;
      const p = toCanvas(wall.x, wall.z);
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    // 绘制坦克标记
    const drawTank = (tank, color) => {
      if (!tank || !tank.alive) return;
      const p = toCanvas(tank.getPosition().x, tank.getPosition().z);
      const angle = tank.getRotation();

      // 方向线
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.sin(angle) * 5, p.y - Math.cos(angle) * 5);
      ctx.stroke();

      // 圆点
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // 白边
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (this.tank1) drawTank(this.tank1, '#22c55e');
    if (this.tank2) drawTank(this.tank2, this.gameMode === 'pve' ? '#3b82f6' : '#dc2626');
  }

}
