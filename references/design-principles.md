# 设计原则与令牌

来源:`mercedes-ui-development`(Product Kit 令牌笔记)+ `CMP-Change-Management-Platform.html` 的奔驰覆盖层 + 实测渲染。数值以 `assets/css/tokens.css` 为准,本文解释"为什么"。

## 1. 五条风格结论

1. **单色主导**:只有一个品牌蓝 `#0078D6` 贯穿主操作、选中态、焦点。彩色只留给状态。
2. **三档圆角 + 统一控件高度**:控件 4px、卡片和面板 8px、白色分组 16px;所有控件同高 32px、14px 字号。容器用轻边线加极轻阴影,控件用 1px 描边。暗色没有阴影,靠 `#C9C9C9` 描边。数值来源与可信度见 `real-ui-measurements.md`。
3. **常规字重的无衬线大标题**:真实 CMP / SmartOps 界面的标题都是普通无衬线、常规到中等字重。气势靠字号,不靠加粗,也不用压缩衬线。
4. **纯黑暗色**:背景、面板、控件同为 `#000`,靠 `#C9C9C9` 描边分层。
5. **语义令牌唯一入口**:业务 CSS 只准引用语义层。

## 2. 三层令牌

| 层 | 前缀 | 谁能用 |
|---|---|---|
| L1 品牌色阶 | `--color-brand-*`、`--color-base-*` | **只读**,仅 `tokens.css` 内部引用 |
| L2 应用语义 | `--color-application-*` | 令牌文件与别名层 |
| L3 短别名 | `--ground --surface --ink --accent --go --stop`… | 业务/组件 CSS 的日常入口,全部由 L2 派生 |

L3 沿用 CMP 原型的命名,所以原型里的片段可以直接搬。`lint-mb-style.mjs` 会拦截业务代码里的 `var(--color-brand-*)`。

## 3. 亮色层次要自建

令牌只给了灰阶,没有给"底面/面板/控件"的分派。照搬暗色"越高越亮"会在亮色顶到白。采用:

| 角色 | 值 | 用途 |
|---|---|---|
| `--ground` | `#E8E8E8` (grey 100) | 页面底 |
| `--surface-3` | `#F0F0F0` | 表头、条带(比底面浅、比面板深,**不用白**) |
| `--surface` | `#F8F8F8` (grey 50) | 面板、表格体 |
| `--surface-2` | `#FFFFFF` | 输入框、按钮、弹层(白留给最高层) |

## 4. 暗色模式

背景、面板、控件、条带全部 `#000`;文字 `#FFF`;描边 `#C9C9C9`。不要为了"层次"引入深灰面。

- 状态色在暗色下提亮:success `#5CCB74`、error `#FF7D73`;warning 保持 `#E8BD00`。
- `--color-application-primary` 在暗色保持 `#0078D6`(规范如此),但纯黑底上对比度约 4.3:1。**小号蓝色文字**用 `--accent-text`(暗色 `#4DA6F5`),大块填充仍用 `--accent`。这是本 skill 在规范之上加的一个令牌。

## 5. 层级靠透明度,不靠换灰

只有 4 档:`1 / .74 / .6 / .38`。

| 用途 | 令牌 |
|---|---|
| 主文字 | `--ink`(1) |
| 次要文字 | `--ink-2`(74%) |
| 三级文字、占位 | `--ink-3`(60%) |
| 禁用 | `opacity: var(--opacity-disabled)`(.38) |

## 6. 形状与间距

- **圆角三档**(来源等级见 `real-ui-measurements.md`):
  - **控件** `--radius: 4px`:按钮、输入、下拉、标签、徽标、表格单元、容器内部的行与分格。来自真实系统用的 Element Plus 基础圆角(**推断**:截图里只有变量名)。
  - **卡片** `--radius-card: 8px`:卡片、方块、面板、表格容器、KPI 条、详情头部、表单分组、弹窗、通知浮层。门户卡片和方块卡片估读都约 8px。
  - **分组** `--radius-group: 16px`:一整块白底、里面放卡片或方块的区域(`.group`)。**实测** 15px,吸附到 16。
  - **其他**:搜索框 `--radius-pill`;状态点、头像、客服按钮 `50%`。不要出现其他 pill。
  - 内层圆角不得大于外层:8px 的卡片里放 4px 的控件,16px 的分组里放 8px 的卡片。
- **控件高度**:`--control-h: 32px`(**实测** `min-height: 32px`)。按钮、输入、下拉、日期框、分段按钮、顶栏搜索一律 32;`--control-h-sm` 24 与 `--control-h-lg` 40 是 Element Plus 的小、大尺寸(**推断**),门户搜索药丸用 40。**同一页面里不能再出现 35、36、48 这类散高度**,`check-render.mjs` 会失败。控件字号 14,边线 1px `--rule`。
- **容器边线与阴影**:亮色 `border:1px solid var(--rule-soft)` + `box-shadow:var(--shadow-card)`(`0 1px 4px` 12%);悬停可升到 `--shadow-card-hover`。暗色 `--rule-soft` 等于 `--rule`,阴影为 `none`。控件边线仍用 `--rule`,因为它们要靠边线被识别。
- 青绿 `--accent-2`(`#20A79C`)取自真实门户:只用于搜索图标和右下客服按钮,不扩展成第二主色。
- **间距刻度**:`0 / 1 / 2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`。其他值(3、5、7、9、10、11、13、14、15、17、18、22…)都是漂移,lint 会警告。
- **容器内边距** 16px(大块详情头部、表单分组用 16 × 24)。**卡片网格**列间距 16、行间距 24(真实门户实测约 15 / 23)。
- 字号:12 / 14 / 16 / 20 / 24 / 26 / 32 / 34 / 48。字重只有 400 / 700。
- 字距:`0`。没有 overline 样式,也就没有为大写准备的字距令牌。
- **大小写**:不用 `text-transform:uppercase`,不用全大写单词(`HIGH`、`SUCCESS`、`WORK`)。标签、表头、徽标、状态值写成首字母大写;数据值也一样,存成 `Success`、`High`,不要存成大写再靠样式转。只有真缩写(SRE、API、JIRA、AKS、UTC)、HTTP 方法(GET)、命令语法、等宽的编号和路径保持原样。
- 栅格 4/8/12 列,断点 480 / 760 / 1100 / 1440;内容宽度 `compact` 在 1440+ 封顶 1680px。

## 7. 状态语义

| 令牌 | 含义 | 色 | 同时必须有 |
|---|---|---|---|
| `--go` | 成功/批准/完成 | 绿 | 文字标签 + 圆点 |
| `--wait` / `--wait-edge` | 待处理/评审中 | 琥珀 | 同上 |
| `--stop` | 失败/回滚/高风险 | 红 | 同上 |
| `--info` | 进行中 | 蓝(暗色为白) | 同上 |
| `--idle` | 草稿/无状态 | 灰 | 同上 |

状态色是页面上**仅有的饱和色**(主蓝除外),所以不要把它们挪作装饰。风险不能只靠红绿区分,必须带文字。

## 8. 已决策的冲突与已修正的问题

| 问题 | 决策 | 依据 |
|---|---|---|
| 标题字体:`mercedes-ui-development` 要 A Title Cond,旧 `mercedes-style` 要 S Title 300 | 默认 **`MB Text` 常规 400**(`--font-display = --font-text`);`--font-display-serif`(A Title Cond)、`--font-display-light`(S Title 300)作为可选 | 两轮实测:A Title Cond 是压缩**衬线**体,S Title 300 偏细;真实 CMP / SmartOps 界面的标题是常规到中等字重的普通无衬线,`MB Text` 400/700 最贴近。CMP 原型里窄无衬线标题其实是字体未加载时 Roboto Condensed 兜底的结果 |
| 控件圆角 2px 还是 4px | **4px**(撤回之前的 2px) | 之前的 2px 是沿用原型的写法,没有真实依据。新截图的下拉用 Element Plus 的 `--el-border-radius-base`,默认 4px。变量值没在截图里展开,所以标为推断;`lint-mb-style.mjs` 只放行 `var(--radius*)`,写死的数字仍报错 |
| 容器圆角只有一档 8px 够不够 | 增加 16px 分组档 | 截图 2 的 `.group` 实测 `border-radius: 15px`,里面的方块卡片约 8px。大分组里放卡片是真实的嵌套结构 |
| 控件高度 36 / 40 / 32 混用 | **统一 32** | 截图 3 的 `min-height: 32px` 实测。skill 自己的 `.btn` 40、`.btn.sm` 32、输入 40、标签页 36、搜索 36 全是旧值,CMP 原型照搬后同页出现 8 种控件高度 |
| 小标题、表头、徽标要不要全大写 | **不要**,统一首字母大写 | 用户要求,且真实门户和表单截图里没有任何强制大写。原来的 12px 大写 overline 是 Product Kit 笔记的写法,已删除 `--tracking-overline` |
| 容器要不要全部 8px,还是只有门户卡片 | 全部卡片类容器 8px | 真实证据来自门户卡片和方块卡片。管理页面板、表格容器沿用同档,是为了避免并排割裂,属于一致性判断,不是实测 |
| "2px 与真实 CMP 一致" | **撤回这个依据** | `change-management-layout.png` 是 CMP 原型自己的截图,不是独立的奔驰系统。独立证据是 SmartOps 门户和后来补充的 RC 入口页、发起流程表单(见 `real-ui-measurements.md`) |
| 容器边线:`--rule`(#C9C9C9)硬描边,还是轻边线 + 阴影 | 亮色轻边线 `--rule-soft` + `--shadow-card`;暗色保持硬描边 | 真实卡片边线几乎不可见,靠约 `0 1px 4px` 的阴影分层。暗色无阴影,硬描边是唯一分层手段 |
| 间距混用 3/5/7/9/10/11/13/14/15/17/18… | 统一到刻度 | CMP v3 里 469 个间距值有 210 个越界(45%),版面发散。新增 lint 的 `spacing` 警告 |
| 旧 `mercedes-style` skill | 已并入本 skill 并删除 | 触发词重叠,字体/截图/模板均已迁移 |
| 亮色 `outline` 指向红 `#AE1A1A`(Product Kit 疑似遗留错误) | 用 `grey.200 #C9C9C9` | 与暗色一致,符合克制基调 |
| 原型用 `body * { border-radius: 2px !important }` 全局压圆角 | 改为组件内直接用 `var(--radius)`,不用 `!important` 覆盖 | lint 在原版上报出 85 处圆角违规,都是被覆盖掩盖的 |
| 原型从 Google Fonts 拉 Roboto Condensed / Source Sans 3 | 不用 CDN,随包提供 MB Corpo woff2;缺字时才回退 | 离线可用;客户内网常屏蔽外链 |
| `local("PingFang SC")` 在 Chrome/macOS 失效 | 汉字面补全 PostScript/全名 | 见 `typography.md` |
