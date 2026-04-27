# 3D 坦克大战

基于 **Three.js** 的网页版 3D 坦克对战游戏，支持双人对战 (PvP) 和人机对战 (PvE) 两种模式，兼容 PC 与移动端触屏操控。

## 在线体验

🔗 [https://tank-battle-3d-nine.vercel.app](https://tank-battle-3d-nine.vercel.app)

## 功能特性

### 游戏模式

| 模式 | 说明 |
|------|------|
| **双人对战 (PvP)** | 两名玩家同屏对战，先击杀 10 次获胜 |
| **人机对战 (PvE)** | 单人挑战 AI，无限关卡递增难度，含排行榜 |

### 5 种视角模式

| 按键 | 视角 | 说明 |
|------|------|------|
| `1` | 俯视 | 正上方俯瞰全局 |
| `2` | 斜角 | 45° 斜角观察（默认） |
| `3` | 近景 | 低角度近景 |
| `4` | 第一人称 | 坦克炮塔视角 + 微缩地图 |
| `5` | 分屏 | 上下分屏双第一人称，P2 视图自动翻转 180° |

### 4 种场景主题

按 `C` 键循环切换：明亮 → 均衡 → 黄昏 → 暗夜

### 移动端触屏操控

- **摇杆**：左下/右上虚拟摇杆控制移动
- **射击按钮**：右下/左上射击按钮
- **PvP 翻转**：P2 操控图标自动翻转 180°，摇杆方向同步适配
- **FPV 精简**：4 号视角仅显示一组控件
- **工具栏**：底部视角/主题/暂停快捷按钮

### PvE 无限关卡

- 每关需击杀递增数量的 AI 敌人
- AI 难度逐关提升（追击速度、射击频率）
- 失败后可留名提交成绩到在线排行榜
- 暂停退出时如有击杀记录也可留名

### 其他特性

- 随机地图生成（边界钢墙 + 中央掩体 + 随机砖墙）
- 坦克复活机制（3 秒延迟随机出生点）
- PC 端鼠标拖拽旋转视角（OrbitControls）
- 竖屏自适应（相机自动拉远）

## 操作方式

### PC 键盘

| 操作 | 玩家 1 | 玩家 2 |
|------|--------|--------|
| 移动 | `W` `A` `S` `D` | `↑` `←` `↓` `→` |
| 射击 | `空格` | `Enter` |
| 暂停 | `P` | `P` |
| 视角 | `1` `2` `3` `4` `5` | — |
| 主题切换 | `C` | — |

### 通用快捷键

| 按键 | 功能 |
|------|------|
| `R` | 重新开始 |
| `Esc` | 暂停 / 退出菜单 |

## 技术栈

- **渲染引擎**：Three.js r184
- **构建工具**：Vite 8
- **部署平台**：Vercel（Serverless API）
- **数据存储**：Upstash Redis（排行榜）
- **语言**：JavaScript (ES Modules)

## 项目结构

```
game-3d/
├── api/
│   └── leaderboard.js        # Vercel Serverless 排行榜 API
├── src/
│   ├── ai/
│   │   └── AITank.js         # AI 坦克逻辑
│   ├── entities/
│   │   ├── Bullet.js         # 子弹实体
│   │   ├── ParticleSystem.js # 爆炸粒子效果
│   │   ├── Tank.js           # 坦克实体
│   │   └── Wall.js           # 墙壁实体
│   ├── game/
│   │   ├── AudioManager.js   # 音频管理
│   │   ├── Game.js           # 游戏核心逻辑
│   │   ├── InputManager.js   # 输入管理
│   │   ├── TouchControls.js  # 触屏控制
│   │   └── UIManager.js      # UI 管理
│   ├── utils/
│   │   └── MathUtils.js      # 数学工具
│   ├── main.js               # 入口文件
│   └── style.css              # 全局样式
├── index.html                 # HTML 入口
├── package.json
└── vite.config.js
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 部署

项目使用 Vercel 部署，排行榜 API 依赖 Upstash Redis：

```bash
# 部署到 Vercel 生产环境
npx vercel --prod --yes
```

需要在 Vercel 项目中配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API 地址 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |

## License

MIT
