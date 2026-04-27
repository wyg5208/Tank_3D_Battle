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
// 触屏控制（手机/平板）
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  touchControls = new TouchControls(game, input, ui);
  document.body.classList.add('touch-device');
}

// 游戏主循环
let lastTime = 0;
function loop(time) {
  requestAnimationFrame(loop);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (game.gameState === 'playing') {
    game.update(dt, input);
    ui.updateHUD(game.tank1, game.tank2);

    if (game.gameState === 'gameover' && game.winner) {
      ui.showGameOver(game.winner.name, game.winner.color);
    }
  }

  game.render();
}

// 键盘控制：重新开始 / 退出 / 暂停 / 视角切换
window.addEventListener('keydown', e => {
  // 游戏结束按键
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

  // 暂停/继续（P键）
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

  // 退出到菜单（Escape - 暂停或游戏结束状态）
  if (e.code === 'Escape') {
    if (game.gameState === 'paused') {
      game.gameState = 'menu';
      game.cleanup();
      ui.showMenu();
    }
    return;
  }

  // 以下按键仅在 playing 时生效
  if (game.gameState !== 'playing') return;

  // 视角切换
  if (e.code === 'Digit1') game.setCameraPreset(1);
  else if (e.code === 'Digit2') game.setCameraPreset(2);
  else if (e.code === 'Digit3') game.setCameraPreset(3);
  else if (e.code === 'Digit4') game.setCameraPreset('fpv');
  else if (e.code === 'Digit5') game.setCameraPreset('split');
  // 场景主题切换
  else if (e.code === 'KeyC') {
    const name = game.cycleTheme();
    ui.updateTheme(name);
  }
});

requestAnimationFrame(loop);
