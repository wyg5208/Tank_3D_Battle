// 触屏控制（支持 PvE 单人 / PvP 双人）
export class TouchControls {
  constructor(game, input, ui) {
    this.game = game;
    this.input = input;
    this.ui = ui;

    // P1 摇杆状态
    this.p1JoystickCenter = { x: 0, y: 0 };
    this.p1ActiveId = null;

    // P2 摇杆状态
    this.p2JoystickCenter = { x: 0, y: 0 };
    this.p2ActiveId = null;

    this.createUI();
    this.updateForMode();
  }

  /** 根据当前游戏模式调整 UI */
  updateForMode() {
    const isPvP = this.game.gameMode === 'pvp';
    const p2Controls = document.getElementById('touch-p2');
    const toolbar = document.getElementById('touch-toolbar');
    if (p2Controls) p2Controls.style.display = isPvP ? 'block' : 'none';
    if (toolbar) toolbar.classList.toggle('pvp', isPvP);
    // 同步当前视角布局
    this.updateForCameraMode(this.game.cameraMode);
  }

  /** 根据视角模式调整触屏布局
   *  1/2/3/5号视角：P2 摇杆和射击按钮翻转180°（摇杆右上、射击左上）
   *  4号视角(FPV)：隐藏 P2 控件，只保留 P1
   */
  updateForCameraMode(cameraMode) {
    const p2Controls = document.getElementById('touch-p2');
    if (!p2Controls) return;

    // FPV 模式：隐藏 P2 控件
    if (cameraMode === 'fpv') {
      p2Controls.classList.remove('p2-flipped');
      p2Controls.classList.add('p2-hidden');
      return;
    }

    // 非FPV 模式：显示 P2 并翻转180°
    p2Controls.classList.remove('p2-hidden');
    p2Controls.classList.add('p2-flipped');
  }

  createUI() {
    const container = document.createElement('div');
    container.id = 'touch-controls';

    // ===== P1 摇杆 (左下) =====
    const p1Div = document.createElement('div');
    p1Div.id = 'touch-p1';
    const p1Joy = this.makeJoystick('p1-joystick-area', 'p1-joystick-knob');
    const p1Fire = this.makeFireBtn('p1-fire-btn');
    p1Div.appendChild(p1Joy.area);
    p1Div.appendChild(p1Fire);
    container.appendChild(p1Div);
    this.p1JoyArea = p1Joy.area;
    this.p1JoyKnob = p1Joy.knob;

    // ===== P2 摇杆 (右上，仅 PvP 显示) =====
    const p2Div = document.createElement('div');
    p2Div.id = 'touch-p2';
    p2Div.style.display = 'none';
    const p2Joy = this.makeJoystick('p2-joystick-area', 'p2-joystick-knob');
    const p2Fire = this.makeFireBtn('p2-fire-btn');
    p2Div.appendChild(p2Joy.area);
    p2Div.appendChild(p2Fire);
    container.appendChild(p2Div);
    this.p2JoyArea = p2Joy.area;
    this.p2JoyKnob = p2Joy.knob;

    // ===== 工具栏（视角/主题切换） =====
    const toolbar = document.createElement('div');
    toolbar.id = 'touch-toolbar';
    const btns = [
      { code: 'Digit1', label: '1' },
      { code: 'Digit2', label: '2' },
      { code: 'Digit3', label: '3' },
      { code: 'Digit4', label: '4' },
      { code: 'Digit5', label: '5' },
      { code: 'KeyC', label: 'C' },
      { code: 'KeyP', label: '⏸' }
    ];
    for (const b of btns) {
      const el = document.createElement('button');
      el.className = 'touch-tool-btn';
      el.textContent = b.label;
      el.dataset.code = b.code;
      toolbar.appendChild(el);
    }
    container.appendChild(toolbar);
    this.toolbar = toolbar;

    document.body.appendChild(container);
    this.bindEvents();
  }

  makeJoystick(areaId, knobId) {
    const area = document.createElement('div');
    area.className = 'touch-joystick-area';
    area.id = areaId;
    const knob = document.createElement('div');
    knob.className = 'touch-joystick-knob';
    knob.id = knobId;
    area.appendChild(knob);
    return { area, knob };
  }

  makeFireBtn(id) {
    const btn = document.createElement('div');
    btn.className = 'touch-fire-btn';
    btn.id = id;
    btn.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="12" fill="#ff4444" opacity="0.85"/></svg>';
    return btn;
  }

  bindEvents() {
    // P1 摇杆 → WASD
    this.bindJoystick(this.p1JoyArea, this.p1JoyKnob,
      (id) => { this.p1ActiveId = id; },
      (id) => { return this.p1ActiveId === id ? { x: this.p1JoystickCenter.x, y: this.p1JoystickCenter.y } : null; },
      (cx, cy) => {
        const c = this.p1JoystickCenter;
        this.updateJoystickKnob(this.p1JoyKnob, cx, cy, c.x, c.y);
        this.mapKeys(cx, cy, c.x, c.y, 'KeyW', 'KeyS', 'KeyA', 'KeyD');
      },
      () => {
        this.p1JoyKnob.style.transform = 'translate(-50%, -50%)';
        this.input.keys['KeyW'] = false; this.input.keys['KeyS'] = false;
        this.input.keys['KeyA'] = false; this.input.keys['KeyD'] = false;
      }
    );

    // P2 摇杆 → 方向键
    this.bindJoystick(this.p2JoyArea, this.p2JoyKnob,
      (id) => { this.p2ActiveId = id; },
      (id) => { return this.p2ActiveId === id ? { x: this.p2JoystickCenter.x, y: this.p2JoystickCenter.y } : null; },
      (cx, cy) => {
        const c = this.p2JoystickCenter;
        this.updateJoystickKnob(this.p2JoyKnob, cx, cy, c.x, c.y);
        this.mapKeys(cx, cy, c.x, c.y, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
      },
      () => {
        this.p2JoyKnob.style.transform = 'translate(-50%, -50%)';
        this.input.keys['ArrowUp'] = false; this.input.keys['ArrowDown'] = false;
        this.input.keys['ArrowLeft'] = false; this.input.keys['ArrowRight'] = false;
      }
    );

    // P1 射击 → Space
    this.bindFireBtn('p1-fire-btn', 'Space');
    // P2 射击 → Enter
    this.bindFireBtn('p2-fire-btn', 'Enter');

    // 工具栏
    this.bindToolbar();
  }

  bindJoystick(area, knob, onStart, getCenter, onMove, onReset) {
    const getTouch = (e, activeId) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) return t;
      }
      return null;
    };

    area.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      onStart(t.identifier);
      const rect = area.getBoundingClientRect();
      // Store center in p1/p2JoystickCenter based on area
      if (area === this.p1JoyArea) {
        this.p1JoystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      } else {
        this.p2JoystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      onMove(t.clientX, t.clientY);
    }, { passive: false });

    area.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const activeId = area === this.p1JoyArea ? this.p1ActiveId : this.p2ActiveId;
      const t = getTouch(e, activeId);
      if (t) onMove(t.clientX, t.clientY);
    }, { passive: false });

    area.addEventListener('touchend', (e) => {
      const activeId = area === this.p1JoyArea ? this.p1ActiveId : this.p2ActiveId;
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) { onReset(); break; }
      }
    });
    area.addEventListener('touchcancel', () => onReset());
  }

  updateJoystickKnob(knob, cx, cy, centerX, centerY) {
    const dx = cx - centerX;
    const dy = cy - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 45;
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  }

  mapKeys(cx, cy, centerX, centerY, upKey, downKey, leftKey, rightKey) {
    const dx = cx - centerX;
    const dy = cy - centerY;
    const threshold = 15;
    this.input.keys[upKey] = dy < -threshold;
    this.input.keys[downKey] = dy > threshold;
    this.input.keys[leftKey] = dx < -threshold;
    this.input.keys[rightKey] = dx > threshold;
  }

  bindFireBtn(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.keys[key] = true;
      this.input.justPressed[key] = true;
    }, { passive: false });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.input.keys[key] = false;
    }, { passive: false });
    btn.addEventListener('touchcancel', () => {
      this.input.keys[key] = false;
    });
  }

  bindToolbar() {
    const btns = this.toolbar.querySelectorAll('.touch-tool-btn');
    for (const btn of btns) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const code = btn.dataset.code;
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
      }, { passive: false });
    }
  }
}
