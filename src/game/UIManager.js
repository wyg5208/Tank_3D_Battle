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
      winnerText: document.getElementById('winner-text'),
      respawnText: document.getElementById('respawn-text'),
      p1Score: document.getElementById('p1-score'),
      p2Score: document.getElementById('p2-score'),
      p1Hp: document.getElementById('p1-hp'),
      p2Hp: document.getElementById('p2-hp'),
      p2Name: document.getElementById('p2-name'),
      helpP1: document.getElementById('help-p1'),
      helpP2: document.getElementById('help-p2'),
      themeIndicator: document.getElementById('theme-indicator')
    };

    this.menuBtns = document.querySelectorAll('.mode-btn');
    this.bindMenuKeys();
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
        this.els.menu.style.display = 'none';
        this.onModeSelect(this.modes[this.selectedIndex]);
      }
    });
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
  }

  showHUD(mode) {
    this.els.menu.style.display = 'none';
    this.els.hud.style.display = 'block';
    this.els.gameover.style.display = 'none';

    if (mode === 'pve') {
      this.els.p2Name.textContent = '电脑';
      this.els.p2Name.style.color = '#3b82f6';
      this.els.helpP1.textContent = '玩家1: WASD/方向键移动 | 空格射击';
      this.els.helpP2.textContent = '对手: AI电脑';
    } else {
      this.els.p2Name.textContent = '玩家2';
      this.els.p2Name.style.color = '#dc2626';
      this.els.helpP1.textContent = '玩家1: WASD移动 | 空格射击';
      this.els.helpP2.textContent = '玩家2: 方向键移动 | 回车射击';
    }
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
    this.els.winnerText.textContent = `${winnerName} 获胜!`;
    this.els.winnerText.style.color = winnerColor;
  }

  updateTheme(name) {
    if (this.els.themeIndicator) this.els.themeIndicator.textContent = name;
  }
}
