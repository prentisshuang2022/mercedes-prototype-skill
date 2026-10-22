# 布局与组件

打开 `assets/catalog.html` 看全部组件的真实渲染(明暗可切);`assets/admin-shell.html` 是组合好的后台起点。本文说明何时用哪个。

## 1. 页面骨架(后台工作台,默认)

```
┌ .rail 256px 黑 ┬ .topbar 54px 浅 ───────────────────────────┐
│ .brand 82px    │ 面包屑 …………………… 搜索  主题  头像          │
│ .nav           ├────────────────────────────────────────────┤
│  Work          │ .canvas  padding 16/24                      │
│  Inventory     │  .page-head  eyebrow + 标题 + 主操作靠右      │
│                │  .tabs / .toolbar                            │
│ .rail-foot     │  .kpis → .table-wrap → .pager                │
└────────────────┴────────────────────────────────────────────┘
```

| 区域 | 规格 |
|---|---|
| 左导航 | 桌面 256px(≤1100 为 216px),`--chrome` 纯黑,分隔线 `--chrome-rule`;当前项 2px 蓝色左标记 + 粗体 + 1px 描边 |
| 顶栏 | 54px,`--surface`,底部 1px 线;左面包屑,右搜索/身份/通知/头像 |
| 画布 | `--ground`,padding 16/24,`--content-max: 1680px` |
| 页面标题 | `--font-display`(MB Text)32px/400(≤760 为 26px);上方 12px eyebrow(首字母大写,不转大写)标注范围 |
| 工具栏 | 控件统一 `--control-h` 32px、14px 字号,间距 8px;搜索是单层 32px 的框(图标 + 无边框输入),可伸展,主操作靠右,不足一行有序换行 |
| 表格 | 表头 40px 用 `--surface-3`,行 `padding 12/16`,主信息与说明分两行 |

窄屏(≤760px):导航收为左侧抽屉(`body.nav-open`),顶栏出现 ☰,搜索隐藏,表格在 `.table-wrap` 内横向滚动,KPI 变两列。**不要**用固定总宽或缩小字号撑密度。

## 2. 门户模式(服务入口、欢迎页)

**默认仍是左右结构**:服务卡片、搜索、收藏可以直接放进左右结构的 Services 页(`admin-shell.html` 已示范)。只有用户明确要"门户/欢迎页/应用入口"时,才改用真实 SmartOps Portal 的顶栏式布局,参考 `references/images/smartops-portal.jpg`:

1. 黑色横向顶栏(约 54px):☰ + logo + 平台名在左,帮助/文档/全屏/用户图标在右。
2. 深色横幅(截图中约 345px 高,按需调整):问候语(约 32px/400,白字)+ 一行欢迎语,底部一条平台简介。
3. 白底服务区:标题 `Service`(24px/700)在左,胶囊搜索在右;下面是 5/4/3/2/1 列服务卡片;最后一格可放 `Configure favorite services` 的虚线占位卡。
4. 右下角 56px 青绿圆形客服按钮 `.fab`。

从真实界面校准出的细节(尺寸是按截图像素量取的近似值,不是官方规范):

| 元素 | 取值 |
|---|---|
| 服务卡片 | `.card.svc`:白底、1px 轻边线(`--rule-soft`)+ `--shadow-card`、**8px 圆角**、内边距 16、最小高约 132(实测 246×130);上为图标 + 标题(16),中间最多 2 行说明(12px,`--ink-2`),底部左为简称(`.mono`)、右为收藏星标 |
| 卡片网格 | `.svc-grid`:列距 16、行距 24(实测约 15 / 23);悬停阴影升到 `--shadow-card-hover` |
| 搜索 | `.search-pill`:**胶囊**、白底、青绿放大镜 `--accent-2` |
| 客服按钮 | `.fab`:`50%` 圆、`--accent-2` 底 |
| 横幅 | 没有位图素材时用 `--chrome` 纯黑;不要编造外部图片地址;汽车大图、星阵背景需用户提供 |

这几处是门户专属形状;管理页的容器(面板、表格容器、KPI 条、详情头部、弹窗)同样用 8px 卡片档,控件用 4px。青绿只用于搜索图标和客服按钮。

**容器怎么套**:外层容器 8px、内层的行/分格/标签 2px;容器内用 `overflow:hidden`(或 `overflow:auto`)让内部背景被圆角裁切。拼接在一起的块(如详情头部的标题、结论条、流程条)放进同一个外壳,只给外壳圆角。

## 3. 组件速查(`assets/css/components.css`)

| 组件 | 类名 | 何时用 / 要点 |
|---|---|---|
| 按钮 | `.btn` `.primary` `.danger` `.sm` `.icon` | 每个视图只有一个 `.primary`;禁用态 `:disabled` 自动 .38 |
| 输入 | `.field` + `input/select`,`.omni`(全局搜索) | 报错用 `aria-invalid` + `.err` 文案,不只靠红框 |
| 页签 | `.tabs button[aria-pressed]` + `.n` 计数 | 切换数据范围,计数随筛选更新 |
| 状态胶囊 | `.pill` + `.go/.wait/.stop/.info` | **必须有文字**,圆点是装饰 |
| 小标签 | `.tag` + `.go/.wait/.stop` | 风险等级、规则编号 |
| KPI 横条 | `.kpis > .kpi(.stop)` | 细线分隔而非卡片;数值用 `MB Title` 34px |
| 表格 | `.table-wrap > .grid`,`--row-accent` | 仅异常行加左侧色条;数值列 `.num-col` 右对齐 |
| 分页 | `.pager` | 左统计,右翻页;不可用时 `disabled` |
| 进度条 | `.bar(.go/.stop)` + `--p` | 必须配 `role="img"` 与 `aria-label` |
| 时间线 | `.spine > li(.done/.now/.fail)` | 流程阶段、窗口排期 |
| 抽屉 | `dialog.drawer` + `.dlg-head/.dlg-body` | 查看详情,不跳页;Esc 关闭 |
| 弹窗 | `dialog.modal` + `.dlg-foot` | 简短表单,取消在左、确认在右 |
| 通知条 | `.notice` | 模拟数据提示、操作反馈,配 `role="status"` |
| 搜索胶囊 | `.search-pill` | 门户/服务页的搜索;全局搜索仍用 `.omni`(2px) |
| 服务卡片 | `.card.svc` + `.svc-grid` + `.star` | 服务入口;收藏用 `aria-pressed`,星标 ☆/★ |
| 客服按钮 | `.fab` | 仅门户,固定右下角 |

## 4. SRE / 变更管理场景约定

来自 CMP 原型:

- **变更单**:编号(`.mono`)+ 标题两行;服务 · 版本 · 环境;状态胶囊 + 下一步;风险 `.tag`;窗口 `MM-DD HH:mm → HH:mm`,标注时区(如 UTC+8)。
- **状态映射**:Draft→idle、SRE review→wait、Approved→go、In progress→info、Completed→go、Rolled back→stop。
- **行色条**:失败/高风险 → `--stop`;评审中 → `--wait-edge`;其余不加。不要把所有行都涂色。
- **KPI**:Open / Waiting on me / High risk / Rolled back / Success rate。异常 KPI 加 `.stop`,其余保持墨色。
- **指标带单位和范围**:CPU `%`、延迟 `ms`、容量 `GiB`、`req/s`;区分瞬时值、平均值、分位数。汇总与明细用同一份模拟数据,数量要对得上。
- **图表**:用 SVG/Canvas,保留坐标、单位、图例和时间范围;只突出少量关键曲线;筛选与表格仍是 HTML。
- **模拟数据**:页面里明确标注(`Simulated data`),不调用真实接口、不写 localStorage。

## 4b. 控件尺寸与表单

| 元素 | 规格 |
|---|---|
| 按钮、输入、下拉、日期框、分段按钮、标签页按钮 | 高 `--control-h` 32px;字号 14;圆角 4px;边线 1px `--rule`;内边距左右 12(主按钮 16)。**实测** 下拉 `min-height:32px;padding:4px 12px;font-size:14px` |
| 小 / 大 | `.btn.sm` 24px / 12px,`.btn.lg` 40px;只在确实需要时使用,同一工具栏里不混用 |
| 下拉框 | `appearance:none`,内边距 **左 12 / 右 32**,自绘箭头 `--icon-chevron`(16px,距右 10px),文字与箭头之间 6px。原生箭头约 16px 宽、占在右内边距里,右边距只给 8 时文字会贴着箭头。所有下拉(含顶栏、分页、表单里的)用同一规则 |
| 搜索框(管理页) | 外框 32px,内部图标 + 透明无边框输入,`height:100%`。**不要**让原生 input 带自己的底色和边线,否则就是"框里套框" |
| 表单行 | 左标签、右控件;控件宽 ≤ 440;行与行之间留 8–12px |
| 字段/分组标题 | 14px 加粗,左侧 3px 主蓝竖条(`.bar-title`),来自 RC 表单与入口页 |
| 表格状态色条 | 放在独立的窄列里,`padding:0`,色条 4px 宽、绝对定位撑满行高并贴着容器左边缘;容器 `overflow:hidden` 让圆角裁切它 |

控件字号不要再用 12:12 只给说明文字、徽标、表头这类非交互文本。

## 4c. Launchpad(入口页的分组与方块)

来自 RC 入口页:白色分组 `.group`(**实测** 圆角 15px,取 16)里放 `.bar-title` 分组标题和 `.tile-grid`(列距 16、行距 24)。方块 `.tile` 约 168 × 180,浅灰底、无边线、圆角 8px、内边距 16;顶部 32px 蓝色图标方块(圆角 8px),标题 14px 加粗,说明 12px 灰、贴底。暗色下方块改用 1px `--rule` 描边。模板见 `assets/catalog.html`。

## 5. 品牌标识

`assets/brand/mb-star.svg` 是用户提供的官方星徽(圆环中的三叉星,Illustrator 导出,viewBox `0 0 38 38`,白色填充)。

- 只放在黑色/深色底上(左导航、黑色顶栏、暗色横幅),模板里以内联 SVG + `fill="currentColor"` 使用,颜色由 `--chrome-ink` 决定。
- 左导航品牌区:logo 38px + 平台名(20px/400)+ 12px 副标题(首字母大写);logo 与文字间距 12px。
- 不改色、不裁切、不拉伸、不加投影、不重绘;浅色底上不要直接用白色版。需要浅色版请向品牌门户索取:https://brand-design.mercedes-benz.com/ 。
- 对外交付前确认项目具备标识使用授权,与字体授权同理。
