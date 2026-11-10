System.register("chunks:///_virtual/GameRoot.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, _extends, cclegacy, _decorator, view, ResolutionPolicy, profiler, Camera, Graphics, Color, Vec3, sys, Node, Layers, UITransform, Label, HorizontalTextAlignment, VerticalTextAlignment, Component;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _extends = module.extends;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      view = module.view;
      ResolutionPolicy = module.ResolutionPolicy;
      profiler = module.profiler;
      Camera = module.Camera;
      Graphics = module.Graphics;
      Color = module.Color;
      Vec3 = module.Vec3;
      sys = module.sys;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Label = module.Label;
      HorizontalTextAlignment = module.HorizontalTextAlignment;
      VerticalTextAlignment = module.VerticalTextAlignment;
      Component = module.Component;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "84920qSU29PVIvUbtENEwKg", "GameRoot", undefined);
      var ccclass = _decorator.ccclass;
      var GRID_SIZE = 5;
      var CELL_SIZE = 104;
      var CELL_GAP = 10;
      var BOARD_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;
      var BEST_SCORE_KEY = 'digital_merge_best_score';
      var ANALYTICS_KEY = 'digital_merge_analytics';
      var SESSION_KEY = 'digital_merge_session_id';
      var PALETTE = {
        1: {
          bg: '#E7EDF7',
          text: '#31415E'
        },
        2: {
          bg: '#C9D9F3',
          text: '#243554'
        },
        3: {
          bg: '#8DD3C7',
          text: '#163F38'
        },
        6: {
          bg: '#63B7AF',
          text: '#FFFFFF'
        },
        12: {
          bg: '#F6C85F',
          text: '#4D3600'
        },
        24: {
          bg: '#EF9B59',
          text: '#FFFFFF'
        },
        48: {
          bg: '#ED765E',
          text: '#FFFFFF'
        },
        96: {
          bg: '#D65A73',
          text: '#FFFFFF'
        },
        192: {
          bg: '#A65AA8',
          text: '#FFFFFF'
        },
        384: {
          bg: '#6C63C7',
          text: '#FFFFFF'
        },
        768: {
          bg: '#3E5DB6',
          text: '#FFFFFF'
        },
        1536: {
          bg: '#1E3E78',
          text: '#FFFFFF'
        }
      };
      var GameRoot = exports('GameRoot', (_dec = ccclass('GameRoot'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameRoot, _Component);
        function GameRoot() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.startLayer = void 0;
          _this.gameLayer = void 0;
          _this.boardLayer = void 0;
          _this.overlayLayer = void 0;
          _this.scoreLabel = void 0;
          _this.bestLabel = void 0;
          _this.overlayTitle = void 0;
          _this.overlayDetail = void 0;
          _this.overlayReviveButton = void 0;
          _this.overlayRestartButton = void 0;
          _this.selectedIndex = -1;
          _this.board = [];
          _this.score = 0;
          _this.bestScore = 0;
          _this.gameOver = false;
          _this.reviveUsed = false;
          _this.adPlaying = false;
          _this.sessionId = '';
          return _this;
        }
        var _proto = GameRoot.prototype;
        _proto.onLoad = function onLoad() {
          view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
          try { profiler.hideStats(); } catch (e) {}
          var camera = this.node.getComponentInChildren(Camera);
          if (camera) camera.orthoHeight = 640;
          this.bestScore = this.readBestScore();
          this.sessionId = this.getOrCreateSessionId();
          this.logEvent('app_open', {
            best_score: this.bestScore
          });
          this.buildStaticUi();
          this.showStart();
        };
        _proto.buildStaticUi = function buildStaticUi() {
          var _this2 = this;
          this.startLayer = this.createLayer('StartLayer', this.node);
          this.gameLayer = this.createLayer('GameLayer', this.node);
          this.overlayLayer = this.createLayer('OverlayLayer', this.node);
          var bg = this.createLayer('Background', this.startLayer);
          var g = bg.addComponent(Graphics);
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
          var card = this.createShape(this.startLayer, 620, 330, '#142B4A', 0, -55, 34, '#2B4D76');
          this.createLabel(card, '玩法', 28, '#77E5D8', 0, 114, 540, 42);
          this.createLabel(card, '1  选择一个数字方块', 24, '#E7EDF7', 0, 62, 520, 38);
          this.createLabel(card, '2  再点击相邻的同数字方块', 24, '#E7EDF7', 0, 16, 520, 38);
          this.createLabel(card, '3  数字翻倍，分数增加', 24, '#E7EDF7', 0, -30, 520, 38);
          this.createLabel(card, '无法继续合并时，挑战结束', 20, '#93A8C8', 0, -86, 520, 34);
          this.createButton(this.startLayer, '开始挑战', 0, -320, 420, 96, '#26C6B5', '#0F2C38', function () {
            return _this2.startGame();
          });
          this.createLabel(this.startLayer, '第一版原型 · 数据仅保存在本机', 17, '#6F86A8', 0, -405, 600, 28);
          var gameBg = this.createLayer('GameBackground', this.gameLayer);
          var gg = gameBg.addComponent(Graphics);
          gg.fillColor = new Color(9, 19, 36, 255);
          gg.rect(-360, -640, 720, 1280);
          gg.fill();
          this.createLabel(this.gameLayer, '数字合成大挑战', 34, '#FFFFFF', 0, 580, 620, 48, true);
          this.bestLabel = this.createLabel(this.gameLayer, '最高分 0', 19, '#93A8C8', -240, 520, 220, 30);
          this.scoreLabel = this.createLabel(this.gameLayer, '得分 0', 34, '#77E5D8', 0, 493, 260, 48);
          this.createLabel(this.gameLayer, '点击相邻同数字合并', 18, '#6F86A8', 240, 520, 220, 30);
          this.boardLayer = this.createLayer('Board', this.gameLayer);
          this.boardLayer.setPosition(new Vec3(0, -20, 0));
          var boardFrame = this.createLayer('BoardFrame', this.boardLayer);
          var bf = boardFrame.addComponent(Graphics);
          bf.fillColor = new Color(20, 43, 74, 255);
          bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
          bf.fill();
          bf.strokeColor = new Color(50, 84, 122, 255);
          bf.lineWidth = 2;
          bf.roundRect(-BOARD_SIZE / 2 - 16, -BOARD_SIZE / 2 - 16, BOARD_SIZE + 32, BOARD_SIZE + 32, 30);
          bf.stroke();
          this.createLabel(this.gameLayer, '同数字相邻才能合并 · 合并后会在随机空位生成新方块', 17, '#6F86A8', 0, -392, 650, 28);
          var overlayBg = this.createLayer('OverlayBackground', this.overlayLayer);
          var og = overlayBg.addComponent(Graphics);
          og.fillColor = new Color(0, 0, 0, 190);
          og.rect(-360, -640, 720, 1280);
          og.fill();
          var panel = this.createShape(this.overlayLayer, 610, 560, '#142B4A', 0, 20, 34, '#34638F');
          this.overlayTitle = this.createLabel(panel, '挑战结束', 48, '#FFFFFF', 0, 185, 520, 66, true);
          this.overlayDetail = this.createLabel(panel, '', 23, '#C9D9F3', 0, 112, 520, 104);
          this.overlayReviveButton = this.createButton(panel, '看广告复活', 0, -30, 430, 90, '#F6C85F', '#463300', function () {
            return _this2.tryRevive();
          });
          this.overlayRestartButton = this.createButton(panel, '重新开始', 0, -145, 430, 90, '#26C6B5', '#0F2C38', function () {
            return _this2.startGame();
          });
          this.createLabel(panel, '当前为广告模拟接口，不会产生真实广告或收益', 15, '#6F86A8', 0, -225, 520, 26);
        };
        _proto.showStart = function showStart() {
          this.startLayer.active = true;
          this.gameLayer.active = false;
          this.overlayLayer.active = false;
        };
        _proto.startGame = function startGame() {
          this.board = new Array(GRID_SIZE * GRID_SIZE).fill(0);
          this.score = 0;
          this.selectedIndex = -1;
          this.gameOver = false;
          this.reviveUsed = false;
          this.adPlaying = false;
          this.startLayer.active = false;
          this.gameLayer.active = true;
          this.overlayLayer.active = false;
          for (var i = 0; i < 8; i++) this.spawnRandomTile();
          this.ensurePlayable();
          this.renderBoard();
          this.updateScore();
          this.logEvent('game_start', {
            initial_tiles: 8,
            session_id: this.sessionId
          });
        };
        _proto.onCellTapped = function onCellTapped(index) {
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
          var from = this.selectedIndex;
          if (this.isAdjacent(from, index) && this.board[from] === this.board[index]) {
            var mergedValue = this.board[index] * 2;
            this.board[index] = mergedValue;
            this.board[from] = 0;
            this.selectedIndex = -1;
            this.score += mergedValue * 10;
            this.spawnRandomTile();
            this.saveBestScore();
            this.updateScore();
            this.renderBoard();
            this.logEvent('tile_merge', {
              value: mergedValue,
              score: this.score
            });
            if (!this.hasMoves()) this.endGame();
            return;
          }
          this.selectedIndex = index;
          this.renderBoard();
        };
        _proto.renderBoard = function renderBoard() {
          var _this3 = this;
          var oldTiles = [];
          for (var _iterator = _createForOfIteratorHelperLoose(this.boardLayer.children), _step; !(_step = _iterator()).done;) {
            var _child = _step.value;
            if (_child.name.startsWith('Tile-') || _child.name === 'EmptyGrid') oldTiles.push(_child);
          }
          for (var _i = 0, _oldTiles = oldTiles; _i < _oldTiles.length; _i++) {
            var child = _oldTiles[_i];
            child.destroy();
          }
          var emptyGrid = this.createLayer('EmptyGrid', this.boardLayer);
          var eg = emptyGrid.addComponent(Graphics);
          var start = -BOARD_SIZE / 2 + CELL_SIZE / 2;
          for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
              var x = start + col * (CELL_SIZE + CELL_GAP);
              var y = -start - row * (CELL_SIZE + CELL_GAP);
              eg.fillColor = new Color(31, 58, 91, 255);
              eg.roundRect(x - CELL_SIZE / 2, y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 18);
              eg.fill();
            }
          }
          var _loop = function _loop(i) {
            var _PALETTE$value$bg, _PALETTE$value, _PALETTE$value$text, _PALETTE$value2;
            var value = _this3.board[i];
            if (value === 0) return 1; // continue
            var row = Math.floor(i / GRID_SIZE);
            var col = i % GRID_SIZE;
            var x = start + col * (CELL_SIZE + CELL_GAP);
            var y = -start - row * (CELL_SIZE + CELL_GAP);
            var selected = i === _this3.selectedIndex;
            var tile = _this3.createShape(_this3.boardLayer, CELL_SIZE, CELL_SIZE, (_PALETTE$value$bg = (_PALETTE$value = PALETTE[value]) == null ? void 0 : _PALETTE$value.bg) != null ? _PALETTE$value$bg : '#1E3E78', x, y, selected ? 24 : 18, selected ? '#FFFFFF' : 'rgba(0,0,0,0)', selected ? 5 : 0);
            tile.name = "Tile-" + i;
            _this3.createLabel(tile, String(value), value >= 1000 ? 30 : value >= 100 ? 38 : 46, (_PALETTE$value$text = (_PALETTE$value2 = PALETTE[value]) == null ? void 0 : _PALETTE$value2.text) != null ? _PALETTE$value$text : '#FFFFFF', 0, 0, CELL_SIZE - 12, CELL_SIZE - 12, true);
            tile.on(Node.EventType.TOUCH_END, function () {
              return _this3.onCellTapped(i);
            }, _this3);
          };
          for (var i = 0; i < this.board.length; i++) {
            if (_loop(i)) continue;
          }
        };
        _proto.endGame = function endGame() {
          this.gameOver = true;
          this.selectedIndex = -1;
          this.renderBoard();
          this.overlayLayer.active = true;
          this.overlayTitle.string = '挑战结束';
          this.overlayDetail.string = "\u672C\u5C40\u5F97\u5206  " + this.score + "\n\u6700\u9AD8\u5206  " + this.bestScore;
          this.overlayReviveButton.active = !this.reviveUsed;
          this.overlayRestartButton.setPosition(new Vec3(0, this.reviveUsed ? -30 : -145, 0));
          this.logEvent('game_over', {
            score: this.score,
            best_score: this.bestScore,
            revive_used: this.reviveUsed
          });
        };
        _proto.tryRevive = function tryRevive() {
          var _this4 = this;
          if (this.adPlaying || this.reviveUsed || !this.gameOver) return;
          this.adPlaying = true;
          this.overlayReviveButton.active = false;
          this.overlayTitle.string = '激励视频模拟播放中';
          this.overlayDetail.string = '模拟广告播放 1 秒...\n正式版将接入抖音官方广告 SDK';
          this.logEvent('rewarded_ad_start', {
            placement: 'game_over_revive'
          });
          this.scheduleOnce(function () {
            _this4.reviveUsed = true;
            _this4.adPlaying = false;
            _this4.gameOver = false;
            _this4.selectedIndex = -1;
            _this4.clearLowestTiles(2);
            _this4.ensurePlayable();
            _this4.overlayLayer.active = false;
            _this4.renderBoard();
            _this4.logEvent('rewarded_ad_reward', {
              placement: 'game_over_revive'
            });
          }, 1.1);
        };
        _proto.clearLowestTiles = function clearLowestTiles(count) {
          var occupied = this.board.map(function (value, index) {
            return {
              value: value,
              index: index
            };
          }).filter(function (item) {
            return item.value > 0;
          }).sort(function (a, b) {
            return a.value - b.value;
          }).slice(0, count);
          for (var _iterator2 = _createForOfIteratorHelperLoose(occupied), _step2; !(_step2 = _iterator2()).done;) {
            var item = _step2.value;
            this.board[item.index] = 0;
          }
        };
        _proto.ensurePlayable = function ensurePlayable() {
          var _this5 = this;
          if (this.hasMoves()) return;
          var occupied = this.board.map(function (v, i) {
            return {
              v: v,
              i: i
            };
          }).filter(function (x) {
            return x.v > 0;
          });
          var empty = this.board.map(function (v, i) {
            return {
              v: v,
              i: i
            };
          }).filter(function (x) {
            return x.v === 0;
          });
          if (!occupied.length || !empty.length) return;
          var source = occupied[Math.floor(Math.random() * occupied.length)];
          var candidates = empty.filter(function (item) {
            return _this5.isAdjacent(source.i, item.i);
          });
          var target = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : empty[0];
          this.board[target.i] = source.v;
        };
        _proto.spawnRandomTile = function spawnRandomTile() {
          var empty = this.board.map(function (v, i) {
            return {
              v: v,
              i: i
            };
          }).filter(function (item) {
            return item.v === 0;
          });
          if (!empty.length) return;
          var target = empty[Math.floor(Math.random() * empty.length)];
          var roll = Math.random();
          this.board[target.i] = roll < 0.52 ? 1 : roll < 0.86 ? 2 : 3;
        };
        _proto.hasMoves = function hasMoves() {
          for (var row = 0; row < GRID_SIZE; row++) {
            for (var col = 0; col < GRID_SIZE; col++) {
              var index = row * GRID_SIZE + col;
              var value = this.board[index];
              if (value === 0) continue;
              if (col + 1 < GRID_SIZE && this.board[index + 1] === value) return true;
              if (row + 1 < GRID_SIZE && this.board[index + GRID_SIZE] === value) return true;
            }
          }
          return false;
        };
        _proto.isAdjacent = function isAdjacent(a, b) {
          var ar = Math.floor(a / GRID_SIZE);
          var ac = a % GRID_SIZE;
          var br = Math.floor(b / GRID_SIZE);
          var bc = b % GRID_SIZE;
          return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
        };
        _proto.updateScore = function updateScore() {
          this.scoreLabel.string = "\u5F97\u5206 " + this.score;
          this.bestLabel.string = "\u6700\u9AD8\u5206 " + this.bestScore;
        };
        _proto.readBestScore = function readBestScore() {
          var value = Number(sys.localStorage.getItem(BEST_SCORE_KEY) || '0');
          return Number.isFinite(value) ? value : 0;
        };
        _proto.saveBestScore = function saveBestScore() {
          if (this.score <= this.bestScore) return;
          this.bestScore = this.score;
          sys.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
          this.updateScore();
        };
        _proto.getOrCreateSessionId = function getOrCreateSessionId() {
          var id = sys.localStorage.getItem(SESSION_KEY);
          if (!id) {
            id = Date.now() + "-" + Math.random().toString(36).slice(2, 10);
            sys.localStorage.setItem(SESSION_KEY, id);
          }
          return id;
        };
        _proto.logEvent = function logEvent(name, payload) {
          var event = _extends({
            event: name,
            time: new Date().toISOString(),
            session_id: this.sessionId
          }, payload);
          try {
            var raw = sys.localStorage.getItem(ANALYTICS_KEY);
            var list = raw ? JSON.parse(raw) : [];
            list.push(event);
            sys.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(list.slice(-200)));
          } catch (_unused) {
            sys.localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event]));
          }
          console.log('[analytics]', event);
        };
        _proto.createLayer = function createLayer(name, parent) {
          var node = new Node(name);
          node.layer = Layers.Enum.UI_2D;
          parent.addChild(node);
          node.addComponent(UITransform);
          return node;
        };
        _proto.createShape = function createShape(parent, width, height, fill, x, y, radius, stroke, lineWidth) {
          if (radius === void 0) {
            radius = 20;
          }
          if (stroke === void 0) {
            stroke = 'rgba(0,0,0,0)';
          }
          if (lineWidth === void 0) {
            lineWidth = 0;
          }
          var node = this.createLayer("Shape-" + width + "x" + height, parent);
          var transform = node.getComponent(UITransform);
          transform.setContentSize(width, height);
          transform.setAnchorPoint(0.5, 0.5);
          node.setPosition(new Vec3(x, y, 0));
          var g = node.addComponent(Graphics);
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
        };
        _proto.createLabel = function createLabel(parent, text, fontSize, color, x, y, width, height, bold) {
          if (bold === void 0) {
            bold = false;
          }
          var node = this.createLayer('Label', parent);
          node.setPosition(new Vec3(x, y, 0));
          var transform = node.getComponent(UITransform);
          transform.setContentSize(width, height);
          var label = node.addComponent(Label);
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
        };
        _proto.createButton = function createButton(parent, text, x, y, width, height, fill, textColor, onClick) {
          var button = this.createShape(parent, width, height, fill, x, y, height / 2, '#FFFFFF', 2);
          button.name = "Button-" + text;
          this.createLabel(button, text, 30, textColor, 0, 0, width - 24, height - 10, true);
          button.on(Node.EventType.TOUCH_START, function () {
            return button.setScale(0.97, 0.97, 1);
          });
          button.on(Node.EventType.TOUCH_END, function () {
            button.setScale(1, 1, 1);
            onClick();
          });
          button.on(Node.EventType.TOUCH_CANCEL, function () {
            return button.setScale(1, 1, 1);
          });
          return button;
        };
        _proto.parseColor = function parseColor(hex) {
          if (hex === 'rgba(0,0,0,0)') return new Color(0, 0, 0, 0);
          if (hex.startsWith('#')) {
            var raw = hex.slice(1);
            if (raw.length === 6) {
              return new Color(parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16), 255);
            }
          }
          return new Color(255, 255, 255, 255);
        };
        return GameRoot;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./GameRoot.ts'], function () {
  return {
    setters: [null],
    execute: function () {}
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});


