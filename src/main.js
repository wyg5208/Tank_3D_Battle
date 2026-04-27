import { Game } from './game/Game.js';
import { InputManager } from './game/InputManager.js';
import { UIManager } from './game/UIManager.js';
import { TouchControls } from './game/TouchControls.js';
import './style.css';

const container = document.getElementById('game-canvas');
const game = new Game(container);
const input = new InputManager();

const ui = new UIManager(mode => {
  game.start(mode);
  input.setMode(mode);
  ui.showHUD(mode);
  ui.updateTheme(game.sceneThemeName);
  if (touchControls) touchControls.updateForMode();
});

ui.showMenu();

let touchControls = null;
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  touchControls = new TouchControls(game, input, ui);
  document.body.classList.add('touch-device');
}

// =====================================================
//  关卡弹层按钮
// =====================================================
document.getElementById('level-next-btn').addEventListener('click', () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
});
document.getElementById('level-retry-btn').addEventListener('click', () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
});
document.getElementById('level-quit-btn').addEventListener('click', () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
});

// =====================================================
//  名字输入 + 排行榜
// =====================================================
const nameOverlay = document.getElementById('name-overlay');
const nameInput = document.getElementById('name-input');
const nameSaveBtn = document.getElementById('name-save-btn');
const nameSkipBtn = document.getElementById('name-skip-btn');
const nameLevelText = document.getElementById('name-level-text');
const leaderboardOverlay = document.getElementById('leaderboard-overlay');
const lbBody = document.getElementById('lb-body');
const lbLoading = document.getElementById('lb-loading');
const lbEmpty = document.getElementById('lb-empty');
const lbCloseBtn = document.getElementById('lb-close-btn');
const menuLeaderboardBtn = document.getElementById('menu-leaderboard-btn');

// 用 localStorage 记住上次名字
const LAST_NAME_KEY = 'tank_last_name';
let savedName = '';

function getLastName() {
  try { return localStorage.getItem(LAST_NAME_KEY) || ''; } catch { return ''; }
}
function saveLastName(name) {
  try { localStorage.setItem(LAST_NAME_KEY, name); } catch { /* ignore */ }
}

// ---- 名字输入弹层 ----
function showNameOverlay(level) {
  savedName = getLastName();
  nameInput.value = savedName;
  nameLevelText.textContent = level;
  nameOverlay.style.display = 'flex';
  setTimeout(() => nameInput.focus(), 100);
}

function hideNameOverlay() {
  nameOverlay.style.display = 'none';
}

nameSaveBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  saveLastName(name);
  hideNameOverlay();
  submitScore(name, game.currentLevel);
});

nameSkipBtn.addEventListener('click', () => {
  hideNameOverlay();
  // 跳过 → 回到关卡失败弹层
});

nameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') {
    nameSaveBtn.click();
  }
});

// ---- API 调用 ----
async function submitScore(name, level) {
  showLeaderboard(null);
  try {
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level }),
    });
    loadLeaderboard();
  } catch {
    lbLoading.style.display = 'none';
    lbEmpty.textContent = '网络错误，无法保存成绩';
    lbEmpty.style.display = 'block';
  }
}

async function loadLeaderboard() {
  try {
    const resp = await fetch('/api/leaderboard');
    const data = await resp.json();
    lbLoading.style.display = 'none';

    if (!data.entries || data.entries.length === 0) {
      lbEmpty.style.display = 'block';
      return;
    }

    lbBody.innerHTML = '';
    data.entries.forEach((e, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.level}</td>
        <td>${e.date || '--'}</td>
      `;
      lbBody.appendChild(tr);
    });
  } catch {
    lbLoading.style.display = 'none';
    lbEmpty.textContent = '网络错误，无法加载排行榜';
    lbEmpty.style.display = 'block';
  }
}

function showLeaderboard(entries) {
  lbBody.innerHTML = '';
  lbEmpty.style.display = 'none';
  lbLoading.style.display = entries ? 'none' : 'block';
  leaderboardOverlay.style.display = 'flex';
}

function hideLeaderboard() {
  leaderboardOverlay.style.display = 'none';
}

lbCloseBtn.addEventListener('click', hideLeaderboard);

// 菜单"排行榜"按钮
menuLeaderboardBtn.addEventListener('click', () => {
  showLeaderboard(null);
  loadLeaderboard();
});

// ESC 关闭排行榜
document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && leaderboardOverlay.style.display === 'flex') {
    hideLeaderboard();
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =====================================================
//  主循环
// =====================================================
let levelOverlayShown = false;
let nameOverlayShown = false;

let lastTime = 0;
function loop(time) {
  requestAnimationFrame(loop);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (game.gameState === 'playing') {
    game.update(dt, input);
    ui.updateHUD(game.tank1, game.tank2);
    if (game.gameMode === 'pve') {
      ui.updateLevelBadge(game.currentLevel, game.killsForLevel());
    }
    levelOverlayShown = false;
    nameOverlayShown = false;

    if (game.gameState === 'levelComplete') {
      ui.showLevelComplete(game.currentLevel);
      levelOverlayShown = true;
    } else if (game.gameState === 'levelFailed') {
      // 先弹出名字输入
      if (!nameOverlayShown) {
        showNameOverlay(game.currentLevel);
        nameOverlayShown = true;
      }
      // 同时显示失败弹层在背后
      ui.showLevelFailed(game.currentLevel);
      levelOverlayShown = true;
    } else if (game.gameState === 'gameover' && game.winner) {
      ui.showGameOver(game.winner.name, game.winner.color);
    }
  }

  game.render();
}

// =====================================================
//  键盘事件
// =====================================================
window.addEventListener('keydown', e => {
  // 名字输入弹层按键优先
  if (nameOverlay.style.display === 'flex') {
    // Enter 提交 / Escape 跳过
    if (e.code === 'Escape') {
      nameSkipBtn.click();
    }
    // 不拦截 Tab / 其他输入键
    return;
  }

  // --- 关卡过渡按键 ---
  if (game.gameState === 'levelComplete') {
    if (e.code === 'Enter') {
      game.nextLevel();
      ui.hideLevelOverlay();
      ui.updateLevelBadge(game.currentLevel, game.killsForLevel());
    }
    return;
  }

  if (game.gameState === 'levelFailed') {
    if (e.code === 'KeyR') {
      game.start(game.gameMode);
      input.setMode(game.gameMode);
      ui.showHUD(game.gameMode);
      ui.updateTheme(game.sceneThemeName);
      ui.updateLevelBadge(game.currentLevel, game.killsForLevel());
      if (touchControls) touchControls.updateForMode();
      hideNameOverlay();
    } else if (e.code === 'Escape') {
      game.gameState = 'menu';
      game.cleanup();
      ui.showMenu();
      hideNameOverlay();
    }
    return;
  }

  // --- 游戏结束按键 ---
  if (game.gameState === 'gameover') {
    if (e.code === 'KeyR') {
      game.start(game.gameMode);
      input.setMode(game.gameMode);
      ui.showHUD(game.gameMode);
      ui.updateTheme(game.sceneThemeName);
      if (touchControls) touchControls.updateForMode();
    } else if (e.code === 'Escape') {
      game.gameState = 'menu';
      game.cleanup();
      ui.showMenu();
    }
    return;
  }

  // --- 暂停 ---
  if (e.code === 'KeyP') {
    if (game.gameState === 'playing') {
      game.gameState = 'paused';
      ui.showPause();
    } else if (game.gameState === 'paused') {
      game.gameState = 'playing';
      ui.hidePause();
    }
    return;
  }

  if (e.code === 'Escape') {
    if (game.gameState === 'paused') {
      game.gameState = 'menu';
      game.cleanup();
      ui.showMenu();
    }
    return;
  }

  if (game.gameState !== 'playing') return;

  if (e.code === 'Digit1') game.setCameraPreset(1);
  else if (e.code === 'Digit2') game.setCameraPreset(2);
  else if (e.code === 'Digit3') game.setCameraPreset(3);
  else if (e.code === 'Digit4') game.setCameraPreset('fpv');
  else if (e.code === 'Digit5') game.setCameraPreset('split');
  else if (e.code === 'KeyC') {
    const name = game.cycleTheme();
    ui.updateTheme(name);
  }
});

requestAnimationFrame(loop);
