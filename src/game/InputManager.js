// 键盘输入管理
export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.pveMode = false; // PvE 模式下方向键也控制玩家1
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  /** 设置游戏模式，PvE 下方向键归玩家1 */
  setMode(mode) {
    this.pveMode = (mode === 'pve');
  }

  isDown(code) { return !!this.keys[code]; }
  isJustPressed(code) {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  // 玩家1: WASD，PvE 下方向键也归玩家1
  p1Forward()  { return this.isDown('KeyW') || (this.pveMode && this.isDown('ArrowUp')); }
  p1Backward() { return this.isDown('KeyS') || (this.pveMode && this.isDown('ArrowDown')); }
  p1Left()     { return this.isDown('KeyA') || (this.pveMode && this.isDown('ArrowLeft')); }
  p1Right()    { return this.isDown('KeyD') || (this.pveMode && this.isDown('ArrowRight')); }
  p1Shoot()    { return this.isDown('Space'); }

  // 玩家2: 方向键 + 回车（仅 PvP 有效）
  p2Forward()  { return this.isDown('ArrowUp'); }
  p2Backward() { return this.isDown('ArrowDown'); }
  p2Left()     { return this.isDown('ArrowLeft'); }
  p2Right()    { return this.isDown('ArrowRight'); }
  p2Shoot()    { return this.isDown('Enter'); }

  reset() {
    this.keys = {};
    this.justPressed = {};
  }
}
