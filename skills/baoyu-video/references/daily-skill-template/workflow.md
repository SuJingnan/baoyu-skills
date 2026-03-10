# 每日 Skill 视频制作工作流

本模板确保每期视频的视觉风格、旁白结构、转场效果完全一致，只有 Skill 内容不同。

## 视觉风格：Notion Doodle（手绘笔记风）

手绘笔记/手账风，灵感来自 Notion 极简美学 + 小红书手绘笔记风格。

| 要素 | 规范 |
|------|------|
| 色板 | 米白背景 `#F5F3EF`、黑字 `#1A1A1A`、荧光蓝 `#B8D4E8`、荧光黄 `#F5E6A3`、荧光粉 `#F5C5C5` |
| 背景 | 米白/奶油色 `#F5F3EF`，带微弱纸张纹理 |
| 渲染 | `hand-drawn` — 手绘线条、简笔画涂鸦、荧光笔笔触、非精确渲染 |
| 字体 | 粗体手写/毛笔感（标题）、简洁无衬线（正文）、等宽（代码/链接） |
| 强调 | 荧光笔高亮标记（蓝/黄/粉/绿色半透明笔触覆盖在文字背后） |
| 装饰元素 | 手绘涂鸦（放大镜、火箭、灯泡、箭头、星星、文档图标）、引号装饰括号 |
| 整体感觉 | 像朋友手写的笔记推荐，温暖、亲切、随性但有章法 |
| Ken Burns | 第 1-4、6 页 **none**（静止）；第 5 页 **scroll**（从顶到底平滑滚动） |
| 转场时长 | **0.3s** — 快速切换，不拖泥带水 |

**核心原则**：
- 所有装饰元素都是简笔画/涂鸦风格，不要精致的数字渲染
- 荧光笔高亮是关键视觉语言：每页至少 1-2 处关键词用荧光笔标记
- 大量留白，内容居中，不要填满
- 手写感 > 设计感，温暖 > 专业

## 固定参数

### 视频
- 分辨率: 1080p (1080x1920)
- 帧率: 30fps
- 转场: auto
- 转场时长: 0.3s

### 语音
- Provider: Azure
- Voice: zh-CN-YunxiNeural
- Speed: 1.3

### 固定 6 页结构

| 页 | 角色 | 视觉来源 | Ken Burns | 转场 |
|----|------|----------|-----------|------|
| 1 | 封面/主题切入 | AI 生图（手绘封面） | none | (首页无) |
| 2 | 黄金3秒钩子 | AI 生图（概念图） | none | wiperight |
| 3 | 痛点放大 | AI 生图（列表卡） | none | wipedown |
| 4 | 硬核演示 | AI 生图（知识卡） | none | circleopen |
| 5 | 产品页滚动展示 | **全页截图**（非 AI 生图） | **scroll** | slideright |
| 6 | CTA/下载引导 | AI 生图（手绘 CTA） | none | fadeblack |

### 固定旁白

**开场（第 1 页第 1 句）**:
> 每日一个 Skill，今天分享：{SKILL_NAME}。

**第 5 页产品页滚动展示**（3 句，配合页面从顶部滚动到底部）:
> 句 1: 打开 topskills.com.cn，搜索 {SKILL_NAME}，这就是它的产品页。
> 句 2: 描述「下载源码」按钮和 GitHub 查看入口的位置和功能。
> 句 3: 描述 README 使用说明和「源码预览」在线查看功能。

**旁白要求**：直接描述按钮名称和功能，不提"框""颜色"等标注词。

**收尾（第 6 页最后一句）**:
> 链接就在评论区。关注我，每天推荐一个实用 Skill，下期见。

### 旁白写作原则

| 原则 | 说明 |
|------|------|
| 零废话 | 每句必须有信息增量，删掉所有过渡词/感叹词 |
| 5 秒法则 | 前 5 秒（第 1-2 句）必须命中痛点，否则用户滑走 |
| 动作导向 | 每句告诉观众一个事实或一个行动，不说感受 |
| 禁用词 | 「你知道吗」「其实」「说实话」「不得不说」「老实说」「真的很」「非常好用」 |

## 执行步骤

### Step 1: 获取 Skill 信息

从提供的 URL 提取：
- SKILL_NAME, AUTHOR, STARS, BRIEF, TAGS
- COLLECTION_STARS, COLLECTION_SKILLS
- 核心功能列表、安装/使用命令

信息来源优先级：
1. TopSkills 页面 API / 截图
2. GitHub 源仓库 README
3. GitHub API (stars/forks)

### Step 2: 截取产品页面

截取两种截图：

```bash
# 视口截图（第 1 页封面参考素材）
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu --virtual-time-budget=15000 \
  --screenshot=<output-dir>/screenshot-product.png \
  --window-size=1280,960 "{SKILL_URL}"

# 全页截图（第 5 页滚动展示用）
npx -y puppeteer browsers install chrome && node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 960 });
  await page.goto('{SKILL_URL}', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '<output-dir>/screenshot-fullpage.png', fullPage: true });
  await browser.close();
})();
"
```

截图用途：
| 截图 | 用途 |
|------|------|
| `screenshot-product.png` | 第 1 页 `--ref` 参考素材（AI 生图时提取产品信息） |
| `screenshot-fullpage.png` | **第 5 页直接使用**（ken_burns: scroll，从顶到底滚动） |

### Step 3: 填充图片提示词

读取 `prompts/01-intro.md` 至 `prompts/06-cta.md`，替换 `{PLACEHOLDER}`。

每个 prompt 模板已包含完整的手绘笔记风视觉描述（荧光笔颜色、涂鸦元素、手写字体），不需要额外补充风格说明。

**第 1 页特殊处理**：
- 用 `--ref screenshot-product.png` 将截图传入 Gemini
- Prompt 中说明"参考截图中的产品信息，以手绘笔记风格重新呈现"

**第 5 页不需要 prompt**：直接使用 `screenshot-fullpage.png`，不经过 AI 生图。

**固定页（只替换基本信息）**：01-intro、06-cta
**定制页（根据功能填充）**：02-hook、03-pain、04-demo

### Step 4: 生成图片

```bash
# 第 1 页（带截图参考）
npx -y bun skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles <filled-01-intro>.md \
  --image <output-dir>/01-intro.png \
  --provider google --ar 3:4 --quality 2k \
  --ref <output-dir>/screenshot-product.png

# 第 2-4 页（纯文本 prompt）
npx -y bun skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles <filled-0N>.md \
  --image <output-dir>/0N-<name>.png \
  --provider google --ar 3:4 --quality 2k

# 第 5 页 — 不生成图片
# 直接使用 screenshot-fullpage.png，在 narration.yaml 中引用：
#   image: screenshot-fullpage.png
#   ken_burns: scroll

# 第 6 页（纯文本 prompt）
npx -y bun skills/baoyu-image-gen/scripts/main.ts \
  --promptfiles <filled-06-cta>.md \
  --image <output-dir>/06-cta.png \
  --provider google --ar 3:4 --quality 2k
```

### Step 5: 写 narration.yaml

严格使用固定结构。开场和收尾使用固定文案。

**第 5 页关键配置**：
```yaml
- slide: 5
  image: screenshot-fullpage.png    # 全页截图，非 AI 生图
  ken_burns: scroll                  # 从顶到底平滑滚动
  transition: slideright
  sentences:
    - text: "打开 topskills.com.cn，搜索 {SKILL_NAME}，这就是它的产品页。"
      focus: center
      duration_hint: 5.0
    - text: "（描述下载和 GitHub 入口）"
      focus: center
      duration_hint: 5.5
    - text: "（描述 README 和源码预览功能）"
      focus: center
      duration_hint: 5.5
```

旁白写作遵循零废话原则，每句必须有信息增量。第 5 页旁白只说按钮名称和功能，不提框色或标注。

### Step 6: 生成 TTS + meta.json

```bash
npx -y bun skills/baoyu-tts/scripts/main.ts \
  --text "{句子}" \
  --output <audio-dir>/0N-sentence-00M.mp3 \
  --provider azure --voice zh-CN-YunxiNeural --speed 1.3
```

**重要**: Azure TTS 返回的 duration 不准确，必须用 ffprobe 获取真实时长：
```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 <file>.mp3
```

### Step 7: 合成视频

```bash
npx -y bun skills/baoyu-video/scripts/compose.ts \
  --dir <output-dir>/ \
  --transition-duration 0.3
```

compose.ts 会自动处理 `ken_burns: scroll`：
- 使用 `crop` 滤镜（非 zoompan）实现从顶到底的平滑滚动
- 自动将全页截图缩放到输出宽度（1080px），保持原始高度比例
- 滚动使用余弦缓动（cosine easing），开头和结尾减速，中间加速

自动生成 post.md 用于社交媒体发布。

## 输出目录

```
xhs-images/daily-skill-{slug}/
├── 01-intro.png              # 封面：手绘笔记风 + 大标题
├── 02-hook.png               # 钩子：简笔画概念图 + hook 大字
├── 03-pain.png               # 痛点：手绘 X 标记列表
├── 04-demo.png               # 演示：手绘终端 + 能力标签
├── 06-cta.png                # CTA：TopSkills 下载引导
├── screenshot-product.png    # 视口截图（第 1 页参考素材）
├── screenshot-fullpage.png   # 全页截图（第 5 页滚动展示）
├── narration.yaml
├── audio/
│   ├── 01-sentence-000.mp3
│   ├── ...
│   └── meta.json
├── prompts/                  # 填充后的提示词（可追溯）
│   ├── 01-intro.md
│   ├── ...
│   └── 06-cta.md
├── daily-skill-{slug}.mp4
└── post.md
```
