import {
  _decorator,
  Camera,
  Color,
  Component,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Layers,
  Node,
  profiler,
  ResolutionPolicy,
  sys,
  UITransform,
  Vec3,
  VerticalTextAlignment,
  view,
} from 'cc';

const { ccclass } = _decorator;

const GRID_SIZE = 5;
const CELL_SIZE = 104;
const CELL_GAP = 10;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;
const TRAP_VALUE = -1;
const BEST_SCORE_KEY = 'digital_merge_best_score';
const ANALYTICS_KEY = 'digital_merge_analytics';
const SESSION_KEY = 'digital_merge_session_id';
const UNLOCKED_LEVEL_KEY = 'digital_merge_unlocked_level';
const TUTORIAL_KEY = 'digital_merge_tutorial_v2';
const REWARDED_AD_UNIT_ID = '';

interface LevelConfig {
  level: number;
  name: string;
  target: number;
  seconds: number;
  traps: number;
  trapPenalty: number;
  initialTiles: number;
}

const TARGETS = [80, 130, 190, 270, 360, 470, 590, 720, 860, 1010, 1180, 1360, 1550, 1750, 1960, 2180, 2410, 2650, 2900, 3200];
const TIMES = [60, 55, 52, 50, 48, 46, 44, 42, 40, 38, 36, 35, 34, 33, 32, 31, 30, 29, 28, 28];
const TRAPS = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8];
const NAMES = [
  '初试身手', '数字热身', '小心脚下', '连锁入门', '节奏加快',
  '陷阱初现', '步步为营', '连击时刻', '时间压迫', '危险边缘',
  '陷阱升级', '分秒必争', '连锁大师', '高压合成', '极限冲刺',
  '陷阱风暴', '手速考验', '最后冲刺', '冠军门槛', '终极挑战',
];
const LEVELS: LevelConfig[] = TARGETS.map((target, index) => ({
  level: index + 1,
  name: NAMES[index],
  target,
  seconds: TIMES[index],
  traps: TRAPS[index],
  trapPenalty: Math.min(8, 3 + Math.floor(index / 4)),
  initialTiles: Math.min(12, 7 + Math.floor(index / 4)),
}));

const PALETTE: Record<number, { bg: string; text: string }> = {
  1: { bg: '#E7EDF7', text: '#31415E' },
  2: { bg: '#C9D9F3', text: '#243554' },
  3: { bg: '#8DD3C7', text: '#163F38' },
  6: { bg: '#63B7AF', text: '#FFFFFF' },
  12: { bg: '#F6C85F', text: '#4D3600' },
  24: { bg: '#EF9B59', text: '#FFFFFF' },
  48: { bg: '#ED765E', text: '#FFFFFF' },
  96: { bg: '#D65A73', text: '#FFFFFF' },
  192: { bg: '#A65AA8', text: '#FFFFFF' },
  384: { bg: '#6C63C7', text: '#FFFFFF' },
  768: { bg: '#3E5DB6', text: '#FFFFFF' },
  1536: { bg: '#1E3E78', text: '#FFFFFF' },
};

@ccclass('GameRoot')
export class GameRoot extends Component {
  private startLayer!: Node;
  private gameLayer!: Node;
  private boardLayer!: Node;
  private overlayLayer!: Node;
  private tutorialLayer!: Node;

  private levelLabel!: Label;
  private scoreLabel!: Label;
  private targetLabel!: Label;
  private timerLabel!: Label;
  private bestLabel!: Label;
  private comboLabel!: Label;
  private toastLabel!: Label;
  private progressFill!: Graphics;
  private continueButtonLabel!: Label;
  private resetButton!: Node;
  private startProgressLabel!: Label;

  private overlayTitle!: Label;
  private overlayDetail!: Label;
  private overlayPrimaryButton!: Node;
  private overlayPrimaryLabel!: Label;
  private overlayReviveButton!: Node;
  private overlayReturnButton!: Node;

  private board: number[] = [];
  private currentLevelIndex = 0;
  private unlockedLevel = 1;
  private score = 0;
  private bestScore = 0;
  private timeLeft = 0;
  private combo = 0;
  private lastMergeAt = 0;
  private selectedIndex = -1;
  private gameActive = false;
  private levelWon = false;
  private levelLost = false;
  private reviveUsed = false;
  private adPlaying = false;
  private trapSpawnTimer = 0;
  private lastTimerSecond = -1;
  private toastToken = 0;
  private sessionId = '';

  protected onLoad(): void {
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    try { profiler.hideStats(); } catch { /* release builds do not expose stats */ }
    const camera = this.node.getComponentInChildren(Camera);
    if (camera) camera.orthoHeight = 640;

    this.bestScore = this.readBestScore();
    this.unlockedLevel = this.readUnlockedLevel();
    this.sessionId = this.getOrCreateSessionId();
    this.logEvent('app_open', { best_score: this.bestScore, unlocked_level: this.unlockedLevel });
    this.buildStaticUi();
    this.showStart();
    if (sys.localStorage.getItem(TUTORIAL_KEY) !== '1') this.showTutorial();
  }

  protected update(deltaTime: number): void {
    if (!this.gameActive || this.levelWon || this.levelLost || this.adPlaying) return;

    this.timeLeft = Math.max(0, this.timeLeft - deltaTime);
    const shownSecond = Math.ceil(this.timeLeft);
    if (shownSecond !== this.lastTimerSecond) {
      this.lastTimerSecond = shownSecond;
      this.updateTimerLabel();
    }

    if (this.timeLeft <= 0) {
      this.loseLevel('时间耗尽');
      return;
    }

    if (this.currentLevelIndex >= 4) {
      this.trapSpawnTimer -= deltaTime;
      if (this.trapSpawnTimer <= 0) {
        this.addTrap();
        this.trapSpawnTimer = Math.max(8, 14 - this.levelConfig.level * 0.25);
      }
    }
  }

  private get levelConfig(): LevelConfig {
    return LEVELS[this.currentLevelIndex];
  }

  private buildStaticUi(): void {
    this.startLayer = this.createLayer('StartLayer', this.node);
    this.gameLayer = this.createLayer('GameLayer', this.node);
    this.overlayLayer = this.createLayer('OverlayLayer', this.node);
    this.tutorialLayer = this.createLayer('TutorialLayer', this.node);

    this.buildStartUi();
    this.buildGameUi();
    this.buildOverlayUi();
    this.buildTutorialUi();
  }

  private buildStartUi(): void {
    const bg = this.createLayer('Background', this.startLayer);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(13, 24, 45, 255);
    g.rect(-360, -640, 720, 1280);
    g.fill();
    g.fillColor = new Color(24, 51, 84, 255);
    g.circle(-210, 420, 260);
    g.fill();
    g.fillColor = new Color(35, 91, 107, 255);
    g.circle(290, -450, 320);
    g.fill();

    this.createLabel(this.startLayer, '数字合成', 78, '#FFFFFF', 0, 432, 620, 90, true);
    this.createLabel(this.startLayer, '限时闯关', 52, '#77E5D8', 0, 348, 620, 68, true);
    this.createLabel(this.startLayer, '20 关 · 随机陷阱 · 连锁加分', 27, '#C9D9F3', 0, 266, 650, 42);
    this.createLabel(this.startLayer, '达成目标分数，立即闯下一关', 22, '#93A8C8', 0, 226, 650, 34);

    const card = this.createShape(this.startLayer, 620, 300, '#142B4A', 0, -3, 34, '#2B4D76');
    this.createLabel(card, '闯关规则', 28, '#77E5D8', 0, 104, 540, 42);
    this.createLabel(card, '1  在限时内合成数字，达到目标分数', 23, '#E7EDF7', 0, 50, 550, 36);
    this.createLabel(card, '2  连续合并可叠加连击，偶尔触发双倍暴击', 21, '#E7EDF7', 0, 7, 560, 34);
    this.createLabel(card, '3  红色陷阱会偷走时间，点了会付出代价', 21, '#FFB7B7', 0, -36, 560, 34);
    this.createLabel(card, '4  时间耗尽或无路可走即失败，可看广告复活', 20, '#93A8C8', 0, -82, 560, 34);

    this.continueButtonLabel = this.createLabel(
      this.createButton(this.startLayer, '开始第 1 关', 0, -250, 440, 94, '#26C6B5', '#0F2C38', () => this.startCampaign(false)),
      '开始第 1 关', 30, '#0F2C38', 0, 0, 400, 78, true,
    );
    this.createButton(this.startLayer, '怎么玩？', 0, -345, 300, 64, '#2B4D76', '#E7EDF7', () => this.showTutorial());
    this.resetButton = this.createButton(this.startLayer, '从第 1 关重新开始', 0, -420, 360, 64, '#2B4D76', '#E7EDF7', () => this.startCampaign(true));
    this.startProgressLabel = this.createLabel(this.startLayer, '', 18, '#6F86A8', 0, -485, 620, 30);
  }

  private buildGameUi(): void {
    const gameBg = this.createLayer('GameBackground', this.gameLayer);
    const gg = gameBg.addComponent(Graphics);
    gg.fillColor = new Color(9, 19, 36, 255);
    gg.rect(-360, -640, 720, 1280);
    gg.fill();

    this.levelLabel = this.createLabel(this.gameLayer, '', 30, '#FFFFFF', 0, 584, 660, 44, true);
    this.bestLabel = this.createLabel(this.gameLayer, '最高分 0', 17, '#6F86A8', -240, 538, 200, 28);
    this.targetLabel = this.createLabel(this.gameLayer, '目标 80', 21, '#F6C85F', 0, 535, 250, 34, true);
    this.timerLabel = this.createLabel(this.gameLayer, '剩余 00:50', 26, '#77E5D8', 240, 535, 200, 42, true);
    this.scoreLabel = this.createLabel(this.gameLayer, '得分 0', 38, '#FFFFFF', 0, 488, 320, 52, true);
    this.comboLabel = this.createLabel(this.gameLayer, '保持连击可加分', 18, '#93A8C8', 0, 448, 520, 28);

    this.createShape(this.gameLayer, 620, 18, '#1E3658', 0, 410, 9, 'rgba(0,0,0,0)');
    const progressNode = this.createLayer('ProgressFill', this.gameLayer);
    const progressTransform = progressNode.getComponent(UITransform)!;
    progressTransform.setContentSize(600, 14);
    progressTransform.setAnchorPoint(0, 0.5);
    progressNode.setPosition(new Vec3(-300, 410, 0));
    this.progressFill = progressNode.addComponent(Graphics);

    this.boardLayer = this.createLayer('Board', this.gameLayer);
    this.boardLayer.setPosition(new Vec3(0, -65, 0));
    const boardFrame = this.createLayer('BoardFrame', this.boardLayer);
    const bf = boardFrame.addComponent(Graphics);
    bf.fillColor = new Color(20, 43, 74, 255);
    bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
    bf.fill();
    bf.strokeColor = new Color(50, 84, 122, 255);
    bf.lineWidth = 2;
    bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
    bf.stroke();

    this.toastLabel = this.createLabel(this.gameLayer, '', 24, '#77E5D8', 0, -390, 650, 42, true);
    this.createLabel(this.gameLayer, '先点一个数字，再点它上下左右相邻的同数字', 17, '#6F86A8', 0, -428, 650, 28);
  }

  private buildOverlayUi(): void {
    const overlayBg = this.createLayer('OverlayBackground', this.overlayLayer);
    const og = overlayBg.addComponent(Graphics);
    og.fillColor = new Color(0, 0, 0, 205);
    og.rect(-360, -640, 720, 1280);
    og.fill();

    const panel = this.createShape(this.overlayLayer, 610, 560, '#142B4A', 0, 20, 34, '#34638F');
    this.overlayTitle = this.createLabel(panel, '闯关成功', 48, '#FFFFFF', 0, 192, 520, 66, true);
    this.overlayDetail = this.createLabel(panel, '', 23, '#C9D9F3', 0, 112, 520, 120);
    this.overlayReviveButton = this.createButton(panel, '看广告复活', 0, -30, 430, 90, '#F6C85F', '#463300', () => this.tryRevive());
    this.overlayPrimaryButton = this.createButton(panel, '下一关', 0, -145, 430, 90, '#26C6B5', '#0F2C38', () => this.onOverlayPrimary());
    this.overlayPrimaryLabel = this.overlayPrimaryButton.children.find((child) => child.getComponent(Label))?.getComponent(Label)!;
    this.overlayReturnButton = this.createButton(panel, '返回首页', 0, -235, 300, 62, '#2B4D76', '#C9D9F3', () => this.showStart());
  }

  private buildTutorialUi(): void {
    const bg = this.createLayer('TutorialBackground', this.tutorialLayer);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 220);
    g.rect(-360, -640, 720, 1280);
    g.fill();

    const panel = this.createShape(this.tutorialLayer, 640, 660, '#142B4A', 0, 15, 36, '#34638F');
    this.createLabel(panel, '30 秒看懂怎么玩', 42, '#FFFFFF', 0, 255, 560, 58, true);
    this.createLabel(panel, '点击，不是拖拽', 20, '#77E5D8', 0, 212, 520, 30, true);

    const makeDemoTile = (x: number, text: string, bgColor: string, textColor: string): void => {
      const tile = this.createShape(panel, 92, 92, bgColor, x, 145, 18, 'rgba(0,0,0,0)');
      this.createLabel(tile, text, 42, textColor, 0, 0, 82, 82, true);
    };
    makeDemoTile(-170, '1', '#E7EDF7', '#31415E');
    this.createLabel(panel, '＋', 38, '#77E5D8', -89, 145, 50, 50, true);
    makeDemoTile(-8, '1', '#E7EDF7', '#31415E');
    this.createLabel(panel, '＝', 38, '#77E5D8', 73, 145, 50, 50, true);
    makeDemoTile(154, '2', '#C9D9F3', '#243554');

    this.createLabel(panel, '① 先点一个数字方块', 25, '#E7EDF7', 0, 70, 560, 36, true);
    this.createLabel(panel, '② 再点它上、下、左、右相邻的同数字', 24, '#E7EDF7', 0, 25, 580, 36, true);
    this.createLabel(panel, '③ 相同数字会翻倍：1+1=2，2+2=4，3+3=6', 22, '#C9D9F3', 0, -20, 590, 34);
    this.createLabel(panel, '④ 达到目标分过关；时间用完或没得合并就失败', 21, '#C9D9F3', 0, -67, 590, 34);
    this.createLabel(panel, '红色陷阱不要点，会直接扣时间', 21, '#FF9B9B', 0, -114, 560, 34, true);
    this.createButton(panel, '知道了，去闯关', 0, -225, 430, 86, '#26C6B5', '#0F2C38', () => this.hideTutorial());
    this.tutorialLayer.active = false;
  }

  private showTutorial(): void {
    this.tutorialLayer.active = true;
    this.logEvent('tutorial_open', {});
  }

  private hideTutorial(): void {
    this.tutorialLayer.active = false;
    sys.localStorage.setItem(TUTORIAL_KEY, '1');
    this.logEvent('tutorial_close', {});
  }
  private showStart(): void {
    this.gameActive = false;
    this.startLayer.active = true;
    this.gameLayer.active = false;
    this.overlayLayer.active = false;
    this.resetButton.active = this.unlockedLevel > 1;
    this.continueButtonLabel.string = this.unlockedLevel > 1 ? `继续第 ${this.unlockedLevel} 关` : '开始第 1 关';
    this.startProgressLabel.string = `已解锁 ${this.unlockedLevel}/20 关 · 最高分 ${this.bestScore}`;
  }

  private startCampaign(reset: boolean): void {
    if (reset) {
      this.unlockedLevel = 1;
      this.saveUnlockedLevel();
    }
    this.startLevel(Math.min(19, this.unlockedLevel - 1));
  }

  private startLevel(index: number): void {
    this.currentLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const cfg = this.levelConfig;
    this.board = new Array(GRID_SIZE * GRID_SIZE).fill(0);
    this.score = 0;
    this.combo = 0;
    this.lastMergeAt = 0;
    this.selectedIndex = -1;
    this.timeLeft = cfg.seconds;
    this.lastTimerSecond = -1;
    this.trapSpawnTimer = cfg.level >= 5 ? Math.max(8, 14 - cfg.level * 0.25) : 0;
    this.gameActive = true;
    this.levelWon = false;
    this.levelLost = false;
    this.reviveUsed = false;
    this.adPlaying = false;
    this.startLayer.active = false;
    this.gameLayer.active = true;
    this.overlayLayer.active = false;

    for (let i = 0; i < cfg.initialTiles; i++) this.spawnRandomTile();
    for (let i = 0; i < cfg.traps; i++) this.addTrap(false);
    this.ensurePlayable();
    this.renderBoard();
    this.updateHud();
    this.showToast(`第 ${cfg.level} 关 · ${cfg.name}`, '#77E5D8');
    this.logEvent('level_start', { level: cfg.level, target: cfg.target, seconds: cfg.seconds, traps: cfg.traps });
  }

  private onCellTapped(index: number): void {
    if (!this.gameActive || this.overlayLayer.active || this.board[index] === 0) return;

    if (this.board[index] === TRAP_VALUE) {
      const penalty = this.levelConfig.trapPenalty;
      this.timeLeft = Math.max(0, this.timeLeft - penalty);
      this.board[index] = Math.random() < 0.65 ? 1 : 2;
      this.selectedIndex = -1;
      this.renderBoard();
      this.updateHud();
      this.showToast(`陷阱！时间 -${penalty} 秒`, '#FF7A7A');
      this.logEvent('trap_triggered', { level: this.levelConfig.level, penalty, time_left: this.timeLeft });
      if (this.timeLeft <= 0) this.loseLevel('踩中陷阱，时间耗尽');
      return;
    }

    if (this.selectedIndex === -1) {
      this.selectedIndex = index;
      this.renderBoard();
      this.updateHud();
      return;
    }

    if (this.selectedIndex === index) {
      this.selectedIndex = -1;
      this.renderBoard();
      this.updateHud();
      return;
    }

    const from = this.selectedIndex;
    if (this.isAdjacent(from, index) && this.board[from] === this.board[index]) {
      const mergedValue = this.board[index] * 2;
      this.board[index] = mergedValue;
      this.board[from] = 0;
      this.selectedIndex = -1;

      const now = Date.now();
      this.combo = now - this.lastMergeAt <= 2200 ? Math.min(5, this.combo + 1) : 1;
      this.lastMergeAt = now;
      const critical = Math.random() < 0.08;
      const gained = mergedValue * 10 * this.combo * (critical ? 2 : 1);
      this.score += gained;
      this.spawnRandomTile();
      this.saveBestScore();
      this.updateHud();
      this.renderBoard();

      const comboText = this.combo > 1 ? ` 连击 x${this.combo}` : '';
      this.showToast(`${critical ? '暴击！' : ''}+${gained}${comboText}`, critical ? '#F6C85F' : '#77E5D8');
      this.logEvent('tile_merge', {
        level: this.levelConfig.level,
        value: mergedValue,
        gained,
        combo: this.combo,
        critical,
        score: this.score,
      });

      if (this.score >= this.levelConfig.target) {
        this.winLevel();
        return;
      }

      if (!this.hasMoves()) {
        this.ensurePlayable();
        if (!this.hasMoves()) this.loseLevel('没有可合并的数字了');
      }
      return;
    }

    this.selectedIndex = index;
    this.renderBoard();
    this.updateHud();
  }

  private winLevel(): void {
    this.gameActive = false;
    this.levelWon = true;
    this.selectedIndex = -1;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.saveBestScore();
    this.unlockedLevel = Math.max(this.unlockedLevel, Math.min(20, this.currentLevelIndex + 2));
    this.saveUnlockedLevel();
    this.renderBoard();
    this.updateHud();

    const finalLevel = this.currentLevelIndex === LEVELS.length - 1;
    this.overlayLayer.active = true;
    this.overlayTitle.string = finalLevel ? '全部通关！' : '闯关成功';
    this.overlayDetail.string = finalLevel
      ? `20 关全部完成\n本关得分 ${this.score} · 剩余 ${this.formatTime(this.timeLeft)}`
      : `第 ${this.levelConfig.level} 关达成目标\n得分 ${this.score} / ${this.levelConfig.target} · 剩余 ${this.formatTime(this.timeLeft)}`;
    this.overlayReviveButton.active = false;
    this.overlayPrimaryLabel.string = finalLevel ? '从第 1 关重玩' : '直接闯下一关';
    this.logEvent('level_win', {
      level: this.levelConfig.level,
      score: this.score,
      time_left: this.timeLeft,
      final_level: finalLevel,
    });
  }

  private loseLevel(reason: string): void {
    if (this.levelWon || this.levelLost) return;
    this.gameActive = false;
    this.levelLost = true;
    this.selectedIndex = -1;
    this.renderBoard();
    this.updateHud();
    this.overlayLayer.active = true;
    this.overlayTitle.string = '挑战失败';
    this.overlayDetail.string = `${reason}\n得分 ${this.score} / ${this.levelConfig.target}\n${this.reviveUsed ? '本关复活机会已使用' : '看广告可复活并继续本关'}`;
    this.overlayReviveButton.active = !this.reviveUsed;
    this.overlayPrimaryLabel.string = '重试本关';
    this.logEvent('level_lose', {
      level: this.levelConfig.level,
      reason,
      score: this.score,
      target: this.levelConfig.target,
      revive_used: this.reviveUsed,
    });
  }

  private onOverlayPrimary(): void {
    if (this.levelWon) {
      if (this.currentLevelIndex < LEVELS.length - 1) this.startLevel(this.currentLevelIndex + 1);
      else this.startCampaign(true);
      return;
    }
    if (this.levelLost) this.startLevel(this.currentLevelIndex);
  }

  private tryRevive(): void {
    if (this.adPlaying || this.reviveUsed || !this.levelLost) return;
    this.adPlaying = true;
    this.overlayReviveButton.active = false;
    this.logEvent('rewarded_ad_start', { placement: 'level_fail_revive', level: this.levelConfig.level });

    if (REWARDED_AD_UNIT_ID && (globalThis as any).tt?.createRewardedVideoAd) {
      this.overlayTitle.string = '广告加载中';
      this.overlayDetail.string = '正在加载激励视频...\n完整观看后可复活并继续本关';
      this.playRewardedAd();
      return;
    }

    this.overlayTitle.string = '激励视频模拟播放中';
    this.overlayDetail.string = '当前为网页/开发环境模拟广告\n正式包将调用抖音官方广告 SDK';
    this.scheduleOnce(() => this.grantRevive(), 1.1);
  }

  private playRewardedAd(): void {
    const tt = (globalThis as any).tt;
    let settled = false;
    let ad: any = null;
    const cleanup = (): void => {
      try { ad?.offClose?.(onClose); } catch { /* ignore */ }
      try { ad?.offError?.(onError); } catch { /* ignore */ }
    };
    const fail = (reason: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      this.adPlaying = false;
      this.overlayTitle.string = '广告播放失败';
      this.overlayDetail.string = `${reason}\n可以重试本关，或稍后再试`;
      this.overlayReviveButton.active = !this.reviveUsed;
      this.logEvent('rewarded_ad_fail', { placement: 'level_fail_revive', reason });
    };
    const onClose = (res: any): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!res || res.isEnded === true) this.grantRevive();
      else {
        this.adPlaying = false;
        this.overlayTitle.string = '未完整观看广告';
        this.overlayDetail.string = '完整观看激励视频后才能复活';
        this.overlayReviveButton.active = !this.reviveUsed;
        this.logEvent('rewarded_ad_abandon', { placement: 'level_fail_revive' });
      }
    };
    const onError = (err: any): void => fail(String(err?.errMsg || err?.message || '广告加载异常'));

    try {
      ad = tt.createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID });
      ad.onClose(onClose);
      ad.onError(onError);
      ad.load().then(() => ad.show()).catch((err: any) => fail(String(err?.errMsg || err?.message || '广告加载异常')));
    } catch (err: any) {
      fail(String(err?.errMsg || err?.message || '当前环境不支持激励视频'));
    }
  }

  private grantRevive(): void {
    if (!this.levelLost || this.reviveUsed) return;
    this.reviveUsed = true;
    this.adPlaying = false;
    this.levelLost = false;
    this.gameActive = true;
    this.selectedIndex = -1;
    this.timeLeft = Math.max(12, Math.ceil(this.levelConfig.seconds * 0.4));
    this.lastTimerSecond = -1;
    this.board = this.board.map((value) => (value === TRAP_VALUE ? 0 : value));
    this.ensurePlayable();
    this.overlayLayer.active = false;
    this.renderBoard();
    this.updateHud();
    this.showToast(`复活成功！时间 +${Math.ceil(this.timeLeft)} 秒`, '#F6C85F');
    this.logEvent('rewarded_ad_reward', { placement: 'level_fail_revive', level: this.levelConfig.level });
  }

  private addTrap(showMessage = true): void {
    if (!this.gameActive && showMessage) return;
    const trapCount = this.board.filter((value) => value === TRAP_VALUE).length;
    if (trapCount >= this.levelConfig.traps + 2) return;
    const empty = this.board.map((value, index) => ({ value, index })).filter((item) => item.value === 0);
    if (!empty.length) return;
    const target = empty[Math.floor(Math.random() * empty.length)];
    this.board[target.index] = TRAP_VALUE;
    if (showMessage && this.gameActive) {
      this.renderBoard();
      this.showToast('新的陷阱出现了！', '#FF7A7A');
      this.logEvent('trap_spawned', { level: this.levelConfig.level, trap_count: trapCount + 1 });
    }
  }

  private renderBoard(): void {
    const old: Node[] = [];
    for (const child of this.boardLayer.children) {
      if (child.name === 'EmptyGrid' || child.name.startsWith('Tile-')) old.push(child);
    }
    for (const child of old) child.destroy();

    const emptyGrid = this.createLayer('EmptyGrid', this.boardLayer);
    const eg = emptyGrid.addComponent(Graphics);
    const start = -BOARD_SIZE / 2 + CELL_SIZE / 2;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = start + col * (CELL_SIZE + CELL_GAP);
        const y = -start - row * (CELL_SIZE + CELL_GAP);
        eg.fillColor = new Color(31, 58, 91, 255);
        eg.roundRect(x - CELL_SIZE / 2, y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 18);
        eg.fill();
      }
    }

    for (let i = 0; i < this.board.length; i++) {
      const value = this.board[i];
      if (value === 0) continue;
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const x = start + col * (CELL_SIZE + CELL_GAP);
      const y = -start - row * (CELL_SIZE + CELL_GAP);
      const selected = i === this.selectedIndex;
      const isTrap = value === TRAP_VALUE;
      const tile = this.createShape(
        this.boardLayer,
        CELL_SIZE,
        CELL_SIZE,
        isTrap ? '#6B1F2B' : (PALETTE[value]?.bg ?? '#1E3E78'),
        x,
        y,
        selected ? 24 : 18,
        selected ? '#FFFFFF' : (isTrap ? '#FF8A8A' : 'rgba(0,0,0,0)'),
        selected ? 5 : (isTrap ? 2 : 0),
      );
      tile.name = `Tile-${i}`;
      if (isTrap) {
        this.createLabel(tile, `陷阱\n-${this.levelConfig.trapPenalty}秒`, 22, '#FFE7E7', 0, 0, CELL_SIZE - 12, CELL_SIZE - 12, true);
      } else {
        this.createLabel(
          tile,
          String(value),
          value >= 1000 ? 30 : value >= 100 ? 38 : 46,
          PALETTE[value]?.text ?? '#FFFFFF',
          0,
          0,
          CELL_SIZE - 12,
          CELL_SIZE - 12,
          true,
        );
      }
      tile.on(Node.EventType.TOUCH_END, () => this.onCellTapped(i), this);
    }
  }

  private hasMoves(): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        const value = this.board[index];
        if (value <= 0) continue;
        if (col + 1 < GRID_SIZE && this.board[index + 1] === value) return true;
        if (row + 1 < GRID_SIZE && this.board[index + GRID_SIZE] === value) return true;
      }
    }
    return false;
  }

  private ensurePlayable(): void {
    if (this.hasMoves()) return;
    const occupied = this.board.map((value, index) => ({ value, index })).filter((item) => item.value > 0);
    const empty = this.board.map((value, index) => ({ value, index })).filter((item) => item.value === 0);
    if (!occupied.length) return;

    const sources = occupied
      .map((item) => ({ item, candidates: empty.filter((cell) => this.isAdjacent(item.index, cell.index)) }))
      .filter((entry) => entry.candidates.length > 0);
    if (sources.length > 0) {
      const picked = sources[Math.floor(Math.random() * sources.length)];
      const target = picked.candidates[Math.floor(Math.random() * picked.candidates.length)];
      this.board[target.index] = picked.item.value;
      return;
    }

    const trapIndex = this.board.findIndex((value) => value === TRAP_VALUE);
    if (trapIndex >= 0) {
      this.board[trapIndex] = occupied[Math.floor(Math.random() * occupied.length)].value;
      return;
    }

    const lowest = [...occupied].sort((a, b) => a.value - b.value)[0];
    this.board[lowest.index] = 0;
    const neighbor = this.board
      .map((value, index) => ({ value, index }))
      .filter((cell) => cell.value > 0 && this.isAdjacent(lowest.index, cell.index))[0];
    if (neighbor) this.board[lowest.index] = neighbor.value;
  }

  private spawnRandomTile(): void {
    const empty = this.board.map((value, index) => ({ value, index })).filter((item) => item.value === 0);
    if (!empty.length) return;
    const target = empty[Math.floor(Math.random() * empty.length)];
    const roll = Math.random();
    this.board[target.index] = roll < 0.52 ? 1 : roll < 0.86 ? 2 : 3;
  }

  private isAdjacent(a: number, b: number): boolean {
    const ar = Math.floor(a / GRID_SIZE);
    const ac = a % GRID_SIZE;
    const br = Math.floor(b / GRID_SIZE);
    const bc = b % GRID_SIZE;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  private updateHud(): void {
    const cfg = this.levelConfig;
    this.levelLabel.string = `第 ${cfg.level}/20 关 · ${cfg.name}`;
    this.scoreLabel.string = `得分 ${this.score}`;
    this.targetLabel.string = `目标 ${cfg.target}`;
    this.bestLabel.string = `最高分 ${this.bestScore}`;
    if (this.selectedIndex >= 0) {
      this.comboLabel.string = '已选中：再点它上下左右相邻的同数字';
      this.comboLabel.color = this.parseColor('#77E5D8');
    } else if (this.combo > 1) {
      this.comboLabel.string = `连击 x${this.combo} · 继续连续合并可加分`;
      this.comboLabel.color = this.parseColor('#F6C85F');
    } else {
      this.comboLabel.string = '先点一个数字方块';
      this.comboLabel.color = this.parseColor('#93A8C8');
    }
    this.updateTimerLabel();
    this.drawProgress();
  }

  private updateTimerLabel(): void {
    const danger = this.timeLeft <= 10;
    this.timerLabel.string = `剩余 ${this.formatTime(this.timeLeft)}`;
    this.timerLabel.color = this.parseColor(danger ? '#FF7A7A' : '#77E5D8');
  }

  private drawProgress(): void {
    const ratio = Math.max(0, Math.min(1, this.score / this.levelConfig.target));
    this.progressFill.clear();
    this.progressFill.fillColor = ratio >= 1 ? new Color(119, 229, 216, 255) : new Color(246, 200, 95, 255);
    this.progressFill.roundRect(0, -7, Math.max(1, 600 * ratio), 14, 7);
    this.progressFill.fill();
  }

  private showToast(text: string, color: string): void {
    this.toastLabel.string = text;
    this.toastLabel.color = this.parseColor(color);
    const token = ++this.toastToken;
    this.scheduleOnce(() => {
      if (token === this.toastToken) this.toastLabel.string = '';
    }, 1.35);
  }

  private formatTime(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    if (safe < 60) return `${safe}s`;
    const minute = Math.floor(safe / 60);
    return `${minute}:${String(safe % 60).padStart(2, '0')}`;
  }

  private readBestScore(): number {
    const value = Number(sys.localStorage.getItem(BEST_SCORE_KEY) || '0');
    return Number.isFinite(value) ? value : 0;
  }

  private saveBestScore(): void {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    sys.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
  }

  private readUnlockedLevel(): number {
    const value = Number(sys.localStorage.getItem(UNLOCKED_LEVEL_KEY) || '1');
    return Number.isFinite(value) ? Math.max(1, Math.min(20, Math.floor(value))) : 1;
  }

  private saveUnlockedLevel(): void {
    sys.localStorage.setItem(UNLOCKED_LEVEL_KEY, String(this.unlockedLevel));
  }

  private getOrCreateSessionId(): string {
    let id = sys.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sys.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  private logEvent(name: string, payload: Record<string, unknown>): void {
    const event = {
      event: name,
      time: new Date().toISOString(),
      session_id: this.sessionId,
      ...payload,
    };
    try {
      const raw = sys.localStorage.getItem(ANALYTICS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.push(event);
      sys.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(list.slice(-300)));
    } catch {
      sys.localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event]));
    }
    console.log('[analytics]', event);
    try { (globalThis as any).tt?.reportAnalytics?.(name, event); } catch { /* analytics is best-effort */ }
  }

  private createLayer(name: string, parent: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    parent.addChild(node);
    node.addComponent(UITransform);
    return node;
  }

  private createShape(
    parent: Node,
    width: number,
    height: number,
    fill: string,
    x: number,
    y: number,
    radius = 20,
    stroke = 'rgba(0,0,0,0)',
    lineWidth = 0,
  ): Node {
    const node = this.createLayer(`Shape-${width}x${height}`, parent);
    const transform = node.getComponent(UITransform)!;
    transform.setContentSize(width, height);
    transform.setAnchorPoint(0.5, 0.5);
    node.setPosition(new Vec3(x, y, 0));
    const g = node.addComponent(Graphics);
    g.fillColor = this.parseColor(fill);
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();
    if (lineWidth > 0 && stroke !== 'rgba(0,0,0,0)') {
      g.strokeColor = this.parseColor(stroke);
      g.lineWidth = lineWidth;
      g.roundRect(-width / 2, -height / 2, width, height, radius);
      g.stroke();
    }
    return node;
  }

  private createLabel(
    parent: Node,
    text: string,
    fontSize: number,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bold = false,
  ): Label {
    const node = this.createLayer('Label', parent);
    node.setPosition(new Vec3(x, y, 0));
    const transform = node.getComponent(UITransform)!;
    transform.setContentSize(width, height);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.25);
    label.color = this.parseColor(color);
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.isBold = bold;
    return label;
  }

  private createButton(
    parent: Node,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    textColor: string,
    onClick: () => void,
  ): Node {
    const button = this.createShape(parent, width, height, fill, x, y, height / 2, '#FFFFFF', 2);
    button.name = `Button-${text}`;
    this.createLabel(button, text, 30, textColor, 0, 0, width - 24, height - 10, true);
    button.on(Node.EventType.TOUCH_START, () => button.setScale(0.97, 0.97, 1));
    button.on(Node.EventType.TOUCH_END, () => {
      button.setScale(1, 1, 1);
      onClick();
    });
    button.on(Node.EventType.TOUCH_CANCEL, () => button.setScale(1, 1, 1));
    return button;
  }

  private parseColor(hex: string): Color {
    if (hex === 'rgba(0,0,0,0)') return new Color(0, 0, 0, 0);
    if (hex.startsWith('#')) {
      const raw = hex.slice(1);
      if (raw.length === 6) {
        return new Color(
          parseInt(raw.slice(0, 2), 16),
          parseInt(raw.slice(2, 4), 16),
          parseInt(raw.slice(4, 6), 16),
          255,
        );
      }
    }
    return new Color(255, 255, 255, 255);
  }
}










