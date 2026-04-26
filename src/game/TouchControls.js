// 触屏控制
export class TouchControls {
  constructor(game, input, ui) {
    this.game = game;
    this.input = input;
    this.ui = ui;
    this.joystickCenter = { x: 0, y: 0 };
    this.activeJoystick = null;
    this.createUI();
  }

  createUI() {
    const container = document.createElement('div');
    container.id = 'touch-controls';

    // 左侧摇杆区
    const jArea = document.createElement('div');
    jArea.id = 'joystick-area';
    const jKnob = document.createElement('div');
    jKnob.id = 'joystick-knob';
    jArea.appendChild(jKnob);
    container.appendChild(jArea);

    // 右侧射击按钮
    const fire = document.createElement('div');
    fire.id = 'fire-btn';
    fire.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="12" fill="#ff4444" opacity="0.85"/></svg>';
    container.appendChild(fire);

    // 底部工具栏（视角/主题切换）
    const toolbar = document.createElement('div');
    toolbar.id = 'touch-toolbar';
    const btns = [
      { code: 'Digit1', label: '1' },
      { code: 'Digit2', label: '2' },
      { code: 'Digit3', label: '3' },
      { code: 'Digit4', label: '4' },
      { code: 'Digit5', label: '5' },
      { code: 'KeyC', label: 'C' }
    ];
    for (const b of btns) {
      const el = document.createElement('button');
      el.className = 'touch-tool-btn';
      el.textContent = b.label;
      el.dataset.code = b.code;
      toolbar.appendChild(el);
    }
    container.appendChild(toolbar);

    document.body.appendChild(container);
    this.joystickArea = jArea;
    this.joystickKnob = jKnob;
    this.toolbar = toolbar;
    this.bindEvents();
  }

  bindEvents() {
    this.bindJoystick();
    this.bindFire();
    this.bindToolbar();
  }

  // ===== 虚拟摇杆 =====
  bindJoystick() {
    const area = this.joystickArea;
    const knob = this.joystickKnob;

    const getTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.activeJoystick) return t;
      }
      return null;
    };

    area.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.activeJoystick = t.identifier;
      const rect = area.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.updateJoystick(t.clientX, t.clientY);
    }, { passive: false });

    area.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = getTouch(e);
      if (t) this.updateJoystick(t.clientX, t.clientY);
    }, { passive: false });

    const reset = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.activeJoystick) {
          this.activeJoystick = null;
          this.resetJoystick();
        }
      }
    };
    area.addEventListener('touchend', reset);
    area.addEventListener('touchcancel', reset);
  }

  updateJoystick(cx, cy) {
    const dx = cx - this.joystickCenter.x;
    const dy = cy - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 50;
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    // 更新摇杆圆钮位置
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    this.joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    // 映射到 WASD 按键
    const threshold = 15;
    this.input.keys['KeyW'] = dy < -threshold;
    this.input.keys['KeyS'] = dy > threshold;
    this.input.keys['KeyA'] = dx < -threshold;
    this.input.keys['KeyD'] = dx > threshold;
  }

  resetJoystick() {
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.input.keys['KeyW'] = false;
    this.input.keys['KeyS'] = false;
    this.input.keys['KeyA'] = false;
    this.input.keys['KeyD'] = false;
  }

  // ===== 射击按钮 =====
  bindFire() {
    const btn = document.getElementById('fire-btn');
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.keys['Space'] = true;
      this.input.justPressed['Space'] = true;
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.input.keys['Space'] = false;
    }, { passive: false });

    btn.addEventListener('touchcancel', () => {
      this.input.keys['Space'] = false;
    });
  }

  // ===== 工具栏按钮（视角/主题） =====
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
