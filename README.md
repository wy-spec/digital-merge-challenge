# 数字合成大挑战

Cocos Creator 3.8.8 制作的竖屏数字合成闯关小游戏。

## 在线试玩

https://wy-spec.github.io/digital-merge-challenge/

隐私说明：

https://wy-spec.github.io/digital-merge-challenge/privacy.html

## 当前玩法

- 共 20 关，每关有独立名称、目标分数和限时
- 达到目标分数立即闯关成功，可直接进入下一关
- 时间耗尽或无可用合并时失败
- 失败后才出现激励视频复活入口，每关最多复活一次
- 复活后保留进度并补充时间
- 随机出现红色陷阱，点击会扣除时间
- 连续合并触发连击倍率，最高 x5
- 每次合并有 8% 概率触发双倍暴击
- 本地保存最高分和已解锁关卡
- 基础分析事件覆盖开局、关卡开始、合并、陷阱、胜负、广告和复活

## 难度设计

- 前期关卡提供更充足时间，帮助玩家理解连击
- 中期逐步增加陷阱数量、扣时和额外陷阱生成频率
- 后期目标分数提高、时间缩短，强调快速识别和连锁合并
- 新手第 1 关 60 秒，最终第 20 关 28 秒

## 构建产物

- Web 在线版：`docs/`
- 抖音小游戏目录：`release/douyin/`
- 抖音压缩包：`release/digital-merge-challenge-douyin.zip`

抖音构建包约 3.19 MB，低于普通小游戏 20 MB 上限。

## 正式广告接入

在 `assets/scripts/GameRoot.ts` 中填写：

```ts
const REWARDED_AD_UNIT_ID = '<抖音激励视频广告位ID>';
```

未填写时，网页和开发环境会使用模拟广告；抖音正式环境检测到广告位 ID 后会调用官方激励视频 API。

## 抖音上线步骤

1. 在抖音开发者平台创建正式小游戏并获取 AppID。
2. 替换 `release/douyin/project.config.json` 的 AppID。
3. 在后台创建激励视频广告位并填写 `REWARDED_AD_UNIT_ID`。
4. 使用抖音开发者工具导入 `release/douyin/`。
5. 编译、真机预览、上传测试版本。
6. 按平台要求提交隐私政策、备案和审核资料。

## 目录

- `assets/scenes/main.scene`：主场景
- `assets/scripts/GameRoot.ts`：关卡、计时、陷阱、连击、广告和 UI 逻辑
- `docs/`：GitHub Pages 在线试玩产物
- `release/douyin/`：抖音小游戏构建产物
- `release/digital-merge-challenge-douyin.zip`：抖音构建压缩包

## 手机怎么玩

1. 先点一个数字方块。
2. 再点它上、下、左、右相邻的同数字。
3. 两个相同数字会翻倍，例如 1+1=2。
4. 达到目标分数过关；时间耗尽或没有可合并组合就失败。
5. 红色陷阱不要点，会扣时间。

游戏首次进入会自动显示“30 秒看懂怎么玩”，首页也保留了“怎么玩？”入口。
