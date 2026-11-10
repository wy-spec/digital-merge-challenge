# 数字合成大挑战

基于 Cocos Creator 3.8.8 的竖屏数字合并小游戏。

## 在线试玩

https://wy-spec.github.io/digital-merge-challenge/

隐私说明：

https://wy-spec.github.io/digital-merge-challenge/privacy.html

## 当前功能

- 开始界面与玩法说明
- 5x5 数字棋盘
- 点击选择相邻同数字方块进行合并
- 分数与本地最高分
- 无可用合并时判定失败
- 重新开始
- 激励视频复活：网页环境模拟，抖音环境检测到广告位 ID 后调用真实 SDK
- 本地分析事件：开局、合并、结束、广告开始/奖励/失败/放弃
- 抖音端尽力调用 `tt.reportAnalytics`

## 本地开发

用 Cocos Creator 3.8.8 打开 `package.json` 所在目录，打开 `assets/scenes/main.scene`，点击预览。

## 构建

Web：

```powershell
CocosCreator.exe --project <项目目录> --build "platform=web-mobile;debug=false;startScene=d3195971-1a80-4f62-ac5b-85bcdbfe7558;outputName=web-mobile-final;buildPath=project://build"
```

抖音小游戏：

```powershell
CocosCreator.exe --project <项目目录> --build "platform=bytedance-mini-game;appid=<真实AppID>;orientation=portrait;debug=false;startScene=d3195971-1a80-4f62-ac5b-85bcdbfe7558;outputName=bytedance-mini-game-final;buildPath=project://build"
```

构建完成后，把 `build/bytedance-mini-game-final` 导入抖音开发者工具。

当前可直接导入的占位包在：

- `release/douyin/`
- `release/digital-merge-challenge-douyin.zip`

## 正式广告接入

在 `assets/scripts/GameRoot.ts` 中填写：

```ts
const REWARDED_AD_UNIT_ID = '<抖音激励视频广告位ID>';
```

然后重新构建抖音小游戏包。未填写时保留模拟广告逻辑。

## 上线前必须由账号主体完成

1. 在抖音开发者平台注册/登录并创建小游戏。
2. 取得正式 AppID，替换 `release/douyin/project.config.json` 或重新构建。
3. 在开发者后台创建激励视频广告位，并填入 `REWARDED_AD_UNIT_ID`。
4. 用抖音开发者工具扫码预览、真机测试、上传版本。
5. 按平台要求填写隐私政策、用户协议、备案和审核资料。
6. 提交审核并发布。

## 目录

- `assets/scenes/main.scene`：主场景
- `assets/scripts/GameRoot.ts`：游戏逻辑、UI、广告适配和分析事件
- `docs/`：GitHub Pages 在线试玩产物
- `release/douyin/`：抖音小游戏构建产物
- `release/digital-merge-challenge-douyin.zip`：抖音构建压缩包
