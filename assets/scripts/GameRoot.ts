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
const BEST_SCORE_KEY = 'digital_merge_best_score';
const ANALYTICS_KEY = 'digital_merge_analytics';
const SESSION_KEY = 'digital_merge_session_id';
// 在抖音开发者后台创建激励视频广告位后，把广告位 ID 填到这里。
const REWARDED_AD_UNIT_ID = '';

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
  private scoreLabel!: Label;
  private bestLabel!: Label;
  private overlayTitle!: Label;
  private overlayDetail!: Label;
  private overlayReviveButton!: Node;
  private overlayRestartButton!: Node;
  private selectedIndex = -1;
  private board: number[] = [];
  private score = 0;
  private bestScore = 0;
  private gameOver = false;
  private reviveUsed = false;
  private adPlaying = false;
  private sessionId = '';

  protected onLoad(): void {
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
    try { profiler.hideStats(); } catch { /* release builds do not expose stats */ }
    const camera = this.node.getComponentInChildren(Camera);
    if (camera) camera.orthoHeight = 640;

    this.bestScore = this.readBestScore();
    this.sessionId = this.getOrCreateSessionId();
    this.logEvent('app_open', { best_score: this.bestScore });
    this.buildStaticUi();
    this.showStart();
  }

  private buildStaticUi(): void {
    this.startLayer = this.createLayer('StartLayer', this.node);
    this.gameLayer = this.createLayer('GameLayer', this.node);
    this.overlayLayer = this.createLayer('OverlayLayer', this.node);

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

    this.createLabel(this.startLayer, '数字合成', 78, '#FFFFFF', 0, 415, 620, 90, true);
    this.createLabel(this.startLayer, '大挑战', 52, '#77E5D8', 0, 330, 620, 68, true);
    this.createLabel(this.startLayer, '点击相同数字，合并翻倍', 27, '#C9D9F3', 0, 245, 620, 42);
    this.createLabel(this.startLayer, '目标：用更少的步数拿到更高分', 22, '#93A8C8', 0, 203, 620, 34);

    const card = this.createShape(this.startLayer, 620, 330, '#142B4A', 0, -55, 34, '#2B4D76');
    this.createLabel(card, '玩法', 28, '#77E5D8', 0, 114, 540, 42);
    this.createLabel(card, '1  选择一个数字方块', 24, '#E7EDF7', 0, 62, 520, 38);
    this.createLabel(card, '2  再点击相邻的同数字方块', 24, '#E7EDF7', 0, 16, 520, 38);
    this.createLabel(card, '3  数字翻倍，分数增加', 24, '#E7EDF7', 0, -30, 520, 38);
    this.createLabel(card, '无法继续合并时，挑战结束', 20, '#93A8C8', 0, -86, 520, 34);

    this.createButton(this.startLayer, '开始挑战', 0, -320, 420, 96, '#26C6B5', '#0F2C38', () => this.startGame());
    this.createLabel(this.startLayer, '第一版原型 · 数据仅保存在本机', 17, '#6F86A8', 0, -405, 600, 28);

    const gameBg = this.createLayer('GameBackground', this.gameLayer);
    const gg = gameBg.addComponent(Graphics);
    gg.fillColor = new Color(9, 19, 36, 255);
    gg.rect(-360, -640, 720, 1280);
    gg.fill();

    this.createLabel(this.gameLayer, '数字合成大挑战', 34, '#FFFFFF', 0, 580, 620, 48, true);
    this.bestLabel = this.createLabel(this.gameLayer, '最高分 0', 19, '#93A8C8', -240, 520, 220, 30);
    this.scoreLabel = this.createLabel(this.gameLayer, '得分 0', 34, '#77E5D8', 0, 493, 260, 48);
    this.createLabel(this.gameLayer, '点击相邻同数字合并', 18, '#6F86A8', 240, 520, 220, 30);

    this.boardLayer = this.createLayer('Board', this.gameLayer);
    this.boardLayer.setPosition(new Vec3(0, -20, 0));
    const boardFrame = this.createLayer('BoardFrame', this.boardLayer);
    const bf = boardFrame.addComponent(Graphics);
    bf.fillColor = new Color(20, 43, 74, 255);
    bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
    bf.fill();
    bf.strokeColor = new Color(50, 84, 122, 255);
    bf.lineWidth = 2;
    bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
    bf.stroke();

    this.createLabel(this.gameLayer, '同数字相邻才能合并 · 合并后会在随机空位生成新方块', 17, '#6F86A8', 0, -392, 650, 28);

    const overlayBg = this.createLayer('OverlayBackground', this.overlayLayer);
    const og = overlayBg.addComponent(Graphics);
    og.fillColor = new Color(0, 0, 0, 190);
    og.rect(-360, -640, 720, 1280);
    og.fill();

    const panel = this.createShape(this.overlayLayer, 610, 560, '#142B4A', 0, 20, 34, '#34638F');
    this.overlayTitle = this.createLabel(panel, '挑战结束', 48, '#FFFFFF', 0, 185, 520, 66, true);
    this.overlayDetail = this.createLabel(panel, '', 23, '#C9D9F3', 0, 112, 520, 104);
    this.overlayReviveButton = this.createButton(panel, '看广告复活', 0, -30, 430, 90, '#F6C85F', '#463300', () => this.tryRevive());
    this.overlayRestartButton = this.createButton(panel, '重新开始', 0, -145, 430, 90, '#26C6B5', '#0F2C38', () => this.startGame());
    this.createLabel(panel, '当前为广告模拟接口，不会产生真实广告或收益', 15, '#6F86A8', 0, -225, 520, 26);
  }

  private showStart(): void {
    this.startLayer.active = true;
    this.gameLayer.active = false;
    this.overlayLayer.active = false;
  }

  private startGame(): void {
    this.board = new Array(GRID_SIZE * GRID_SIZE).fill(0);
    this.score = 0;
    this.selectedIndex = -1;
    this.gameOver = false;
    this.reviveUsed = false;
    this.adPlaying = false;
    this.startLayer.active = false;
    this.gameLayer.active = true;
    this.overlayLayer.active = false;

    for (let i = 0; i < 8; i++) this.spawnRandomTile();
    this.ensurePlayable();
    this.renderBoard();
    this.updateScore();
    this.logEvent('game_start', { initial_tiles: 8, session_id: this.sessionId });
  }

  private onCellTapped(index: number): void {
    if (this.gameOver || this.adPlaying || this.board[index] === 0) return;

    if (this.selectedIndex === -1) {
      this.selectedIndex = index;
      this.renderBoard();
      return;
    }

    if (this.selectedIndex === index) {
      this.selectedIndex = -1;
      this.renderBoard();
      return;
    }

    const from = this.selectedIndex;
    if (this.isAdjacent(from, index) && this.board[from] === this.board[index]) {
      const mergedValue = this.board[index] * 2;
      this.board[index] = mergedValue;
      this.board[from] = 0;
      this.selectedIndex = -1;
      this.score += mergedValue * 10;
      this.spawnRandomTile();
      this.saveBestScore();
      this.updateScore();
      this.renderBoard();
      this.logEvent('tile_merge', { value: mergedValue, score: this.score });
      if (!this.hasMoves()) this.endGame();
      return;
    }

    this.selectedIndex = index;
    this.renderBoard();
  }

  private renderBoard(): void {
    const oldTiles: Node[] = [];
    for (const child of this.boardLayer.children) {
      if (child.name.startsWith('Tile-') || child.name === 'EmptyGrid') oldTiles.push(child);
    }
    for (const child of oldTiles) child.destroy();

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
      const tile = this.createShape(
        this.boardLayer,
        CELL_SIZE,
        CELL_SIZE,
        PALETTE[value]?.bg ?? '#1E3E78',
        x,
        y,
        selected ? 24 : 18,
        selected ? '#FFFFFF' : 'rgba(0,0,0,0)',
        selected ? 5 : 0,
      );
      tile.name = `Tile-${i}`;
      this.createLabel(tile, String(value), value >= 1000 ? 30 : value >= 100 ? 38 : 46, PALETTE[value]?.text ?? '#FFFFFF', 0, 0, CELL_SIZE - 12, CELL_SIZE - 12, true);
      tile.on(Node.EventType.TOUCH_END, () => this.onCellTapped(i), this);
    }
  }

  private endGame(): void {
    this.gameOver = true;
    this.selectedIndex = -1;
    this.renderBoard();
    this.overlayLayer.active = true;
    this.overlayTitle.string = '挑战结束';
    this.overlayDetail.string = `本局得分  ${this.score}\n最高分  ${this.bestScore}`;
    this.overlayReviveButton.active = !this.reviveUsed;
    this.overlayRestartButton.setPosition(new Vec3(0, this.reviveUsed ? -30 : -145, 0));
    this.logEvent('game_over', { score: this.score, best_score: this.bestScore, revive_used: this.reviveUsed });
  }

  private tryRevive(): void {
    if (this.adPlaying || this.reviveUsed || !this.gameOver) return;
    this.adPlaying = true;
    this.overlayReviveButton.active = false;
    this.logEvent('rewarded_ad_start', { placement: 'game_over_revive' });

    if (REWARDED_AD_UNIT_ID && (globalThis as any).tt?.createRewardedVideoAd) {
      this.overlayTitle.string = '广告加载中';
      this.overlayDetail.string = '正在加载激励视频...\n完整观看后可复活一次';
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
      try { ad?.offClose?.(onClose); } catch { /* ignore platform cleanup errors */ }
      try { ad?.offError?.(onError); } catch { /* ignore platform cleanup errors */ }
    };
    const fail = (reason: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      this.adPlaying = false;
      this.overlayTitle.string = '广告播放失败';
      this.overlayDetail.string = `${reason}\n可以重新开始，或稍后再试`;
      this.overlayReviveButton.active = !this.reviveUsed;
      this.logEvent('rewarded_ad_fail', { placement: 'game_over_revive', reason });
    };
    const onClose = (res: any): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!res || res.isEnded === true) {
        this.grantRevive();
      } else {
        this.adPlaying = false;
        this.overlayTitle.string = '未完整观看广告';
        this.overlayDetail.string = '完整观看激励视频后才能获得复活机会';
        this.overlayReviveButton.active = !this.reviveUsed;
        this.logEvent('rewarded_ad_abandon', { placement: 'game_over_revive' });
      }
    };
    const onError = (err: any): void => fail(String(err?.errMsg || err?.message || '广告加载异常'));

    try {
      ad = tt.createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID });
      ad.onClose(onClose);
      ad.onError(onError);
      ad.load()
        .then(() => ad.show())
        .catch((err: any) => fail(String(err?.errMsg || err?.message || '广告加载异常')));
    } catch (err: any) {
      fail(String(err?.errMsg || err?.message || '当前环境不支持激励视频'));
    }
  }

  private grantRevive(): void {
    if (!this.gameOver || this.reviveUsed) return;
    this.reviveUsed = true;
    this.adPlaying = false;
    this.gameOver = false;
    this.selectedIndex = -1;
    this.clearLowestTiles(2);
    this.ensurePlayable();
    this.overlayLayer.active = false;
    this.renderBoard();
    this.logEvent('rewarded_ad_reward', { placement: 'game_over_revive' });
  }

  private clearLowestTiles(count: number): void {
    const occupied = this.board
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value > 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, count);
    for (const item of occupied) this.board[item.index] = 0;
  }

  private ensurePlayable(): void {
    if (this.hasMoves()) return;
    const occupied = this.board.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
    const empty = this.board.map((v, i) => ({ v, i })).filter((x) => x.v === 0);
    if (!occupied.length || !empty.length) return;
    const source = occupied[Math.floor(Math.random() * occupied.length)];
    const candidates = empty.filter((item) => this.isAdjacent(source.i, item.i));
    const target = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : empty[0];
    this.board[target.i] = source.v;
  }

  private spawnRandomTile(): void {
    const empty = this.board.map((v, i) => ({ v, i })).filter((item) => item.v === 0);
    if (!empty.length) return;
    const target = empty[Math.floor(Math.random() * empty.length)];
    const roll = Math.random();
    this.board[target.i] = roll < 0.52 ? 1 : roll < 0.86 ? 2 : 3;
  }

  private hasMoves(): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        const value = this.board[index];
        if (value === 0) continue;
        if (col + 1 < GRID_SIZE && this.board[index + 1] === value) return true;
        if (row + 1 < GRID_SIZE && this.board[index + GRID_SIZE] === value) return true;
      }
    }
    return false;
  }

  private isAdjacent(a: number, b: number): boolean {
    const ar = Math.floor(a / GRID_SIZE);
    const ac = a % GRID_SIZE;
    const br = Math.floor(b / GRID_SIZE);
    const bc = b % GRID_SIZE;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  private updateScore(): void {
    this.scoreLabel.string = `得分 ${this.score}`;
    this.bestLabel.string = `最高分 ${this.bestScore}`;
  }

  private readBestScore(): number {
    const value = Number(sys.localStorage.getItem(BEST_SCORE_KEY) || '0');
    return Number.isFinite(value) ? value : 0;
  }

  private saveBestScore(): void {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    sys.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    this.updateScore();
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
      sys.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(list.slice(-200)));
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




