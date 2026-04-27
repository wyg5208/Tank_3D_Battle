// UI管理器
export class UIManager {
  constructor(onModeSelect) {
    this.onModeSelect = onModeSelect;
    this.selectedIndex = 0;
    this.modes = ['pvp', 'pve'];

    this.els = {
      menu: document.getElementById('menu-screen'),
      hud: document.getElementById('hud'),
      gameover: document.getElementById('gameover-screen'),
      pause: document.getElementById('pause-screen'),
      resumeBtn: document.getElementById('resume-btn'),
      quitBtn: document.getElementById('quit-btn'),
      hudPauseBtn: document.getElementById('hud-pause-btn'),
      winnerText: document.getElementById('winner-text'),
      respawnText: document.getElementById('respawn-text'),
      p1Score: document.getElementById('p1-score'),
      p2Score: document.getElementById('p2-score'),
      p1Hp: document.getElementById('p1-hp'),
      p2Hp: document.getElementById('p2-hp'),
      p2Name: document.getElementById('p2-name'),
      helpP1: document.getElementById('help-p1'),
      helpP2: document.getElementById('help-p2'),
      themeIndicator: document.getElementById('theme-indicator'),
      // 关卡系统
      levelBadge: document.getElementById('level-badge'),
      levelOverlay: document.getElementById('level-overlay'),
      levelResultText: document.getElementById('level-result-text'),
      levelHintText: document.getElementById('level-hint-text')
    };

    this.menuBtns = document.querySelectorAll('.mode-btn');
    this.bindMenuKeys();
    this.bindMenuClicks();
    this.bindPauseButtons();
  }

  bindMenuKeys() {
    window.addEventListener('keydown', e => {
      if (this.els.menu.style.display === 'none') return;
      if (e.code === 'ArrowUp') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateMenuSelection();
      } else if (e.code === 'ArrowDown') {
        this.selectedIndex = Math.min(this.modes.length - 1, this.selectedIndex + 1);
        this.updateMenuSelection();
      } else if (e.code === 'Enter') {
        this.startGame();
      }
    });
  }

  /** 菜单按钮触控/点击支持 */
  bindMenuClicks() {
    this.menuBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.selectedIndex = i;
        this.startGame();
      });
      // 移动端 touch 事件
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.selectedIndex = i;
        this.startGame();
      });
    });
  }

  /** 启动游戏 */
  startGame() {
    this.updateMenuSelection();
    this.els.menu.style.display = 'none';
    this.onModeSelect(this.modes[this.selectedIndex]);
  }

  updateMenuSelection() {
    this.menuBtns.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  showMenu() {
    this.els.menu.style.display = 'flex';
    this.els.hud.style.display = 'none';
    this.els.gameover.style.display = 'none';
    this.els.pause.style.display = 'none';
    this.hideLevelOverlay();
  }

  showHUD(mode) {
    this.els.menu.style.display = 'none';
    this.els.hud.style.display = 'block';
    this.els.gameover.style.display = 'none';
    this.els.pause.style.display = 'none';
    this.hideLevelOverlay();

    if (mode === 'pve') {
      this.els.p2Name.textContent = '人机对战';
      this.els.p2Name.style.color = '#3b82f6';
      this.els.helpP1.textContent = '玩家1: WASD/方向键移动 | 空格射击';
      this.els.helpP2.textContent = '对手: AI电脑';
      this.els.levelBadge.style.display = 'block';
      this.els.levelBadge.textContent = '第 1 关';
    } else {
      this.els.p2Name.textContent = '双人对战';
      this.els.p2Name.style.color = '#dc2626';
      this.els.helpP1.textContent = '玩家1: WASD移动 | 空格射击';
      this.els.helpP2.textContent = '玩家2: 方向键移动 | 回车射击';
      this.els.levelBadge.style.display = 'none';
    }
  }

  /** 更新关卡徽章 */
  updateLevelBadge(level, killsNeeded) {
    if (!this.els.levelBadge || this.els.levelBadge.style.display === 'none') return;
    this.els.levelBadge.textContent = `第 ${level} 关`;
    // 击杀进度提示放在 score 旁边
  }

  updateHUD(tank1, tank2) {
    this.els.p1Score.textContent = `击杀: ${tank1.score}`;
    this.els.p2Score.textContent = `击杀: ${tank2.score}`;

    const p1Ratio = tank1.alive ? (tank1.hp / tank1.maxHp * 100) : 0;
    const p2Ratio = tank2.alive ? (tank2.hp / tank2.maxHp * 100) : 0;
    this.els.p1Hp.style.width = `${p1Ratio}%`;
    this.els.p2Hp.style.width = `${p2Ratio}%`;

    this.updateHpColor(this.els.p1Hp, p1Ratio);
    this.updateHpColor(this.els.p2Hp, p2Ratio);

    // 复活倒计时
    let respawnText = '';
    if (!tank1.alive) {
      const rem = Math.max(0, Math.ceil(tank1.respawnDelay - (performance.now() / 1000 - tank1.respawnTimer)));
      respawnText += `${tank1.name} 复活: ${rem}秒 `;
    }
    if (!tank2.alive) {
      const rem = Math.max(0, Math.ceil(tank2.respawnDelay - (performance.now() / 1000 - tank2.respawnTimer)));
      respawnText += `${tank2.name} 复活: ${rem}秒`;
    }
    this.els.respawnText.textContent = respawnText;
    this.els.respawnText.style.display = respawnText ? 'block' : 'none';
  }

  updateHpColor(el, ratio) {
    el.classList.remove('low', 'critical');
    if (ratio <= 25) el.classList.add('critical');
    else if (ratio <= 50) el.classList.add('low');
  }

  showGameOver(winnerName, winnerColor) {
    this.els.gameover.style.display = 'flex';
    this.els.pause.style.display = 'none';
    this.els.winnerText.textContent = `${winnerName} 获胜!`;
    this.els.winnerText.style.color = winnerColor;
  }

  showPause() {
    this.els.pause.style.display = 'flex';
  }

  hidePause() {
    this.els.pause.style.display = 'none';
  }

  updateTheme(name) {
    if (this.els.themeIndicator) this.els.themeIndicator.textContent = name;
  }

  // ============================================================
  //  关卡过渡界面
  // ============================================================

  /** 关卡完成 */
  showLevelComplete(level) {
    const overlay = this.els.levelOverlay;
    overlay.style.display = 'flex';
    overlay.className = 'success';
    this.els.levelResultText.textContent = `第 ${level} 关 完成！`;
    this.els.levelHintText.textContent = '按 Enter 进入下一关';
  }

  /** 关卡失败 */
  showLevelFailed(level) {
    const overlay = this.els.levelOverlay;
    overlay.style.display = 'flex';
    overlay.className = 'failed';
    this.els.levelResultText.textContent = `第 ${level} 关 失败`;
    this.els.levelHintText.textContent = '按 R 重试本关  |  ESC 返回菜单';
  }

  /** 隐藏关卡过渡 */
  hideLevelOverlay() {
    const overlay = this.els.levelOverlay;
    overlay.style.display = 'none';
    overlay.className = '';
  }

  /** 绑定暂停界面按钮 */
  bindPauseButtons() {
    this.els.resumeBtn.addEventListener('click', () => {
      this.hidePause();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', bubbles: true }));
    });
    this.els.quitBtn.addEventListener('click', () => {
      this.hidePause();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    });
    // 底部暂停按钮
    if (this.els.hudPauseBtn) {
      this.els.hudPauseBtn.addEventListener('click', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', bubbles: true }));
      });
    }
  }
}
