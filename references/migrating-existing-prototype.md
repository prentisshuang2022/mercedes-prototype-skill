# 迁移已有原型到奔驰风格

适用于:手上已有一个能用的 HTML 原型(样式叠了好几层、有写死的颜色/圆角),要换成本 skill 的令牌和字体,**同时不能改坏功能**。CMP 变更管理平台就是这样迁移的(315 KB 单文件,约 1900 行脚本)。

## 原则

1. **只动样式层**。数据和 JS 逻辑原样保留;脚本里的行内样式只做必要替换(`var(--font-ui)`、写死的颜色、非字阶字号)。
2. **先证明等价,再谈优化**。样式改完后用计算样式快照对比新旧页面,差异必须能逐类解释。
3. **保留原文件**。输出新文件(如 `-v2.html`),不覆盖原件。

## 步骤

### 1. 摸底

```bash
node scripts/lint-mb-style.mjs <原型.html>      # 违规规模:圆角/字重/CDN/写死颜色
```

同时看三件事:有几层样式叠加(基础层、主题层、覆盖层);有没有 `!important` 全局 hack(如 `body * { border-radius: 2px !important }`);脚本里的行内样式是否都用了 `var(--…)`。全部是 `var(--…)` 的话,换令牌即可,脚本不用动。

### 2. 压平样式层(只删死声明)

用 PostCSS 解析。**只删除"被同选择器、同媒体条件的后续规则覆盖掉的声明"**,不挪动任何规则的位置,所以级联结果必然等价。不要"合并到第一次出现的位置"或"合并到最后一次出现的位置",两种都可能越过中间的同权重规则而改变结果。

同时处理:

| 项目 | 处理 |
|---|---|
| `:root` 令牌层、`prefers-color-scheme` 块 | 整体删除,换成 skill 的 `tokens.css`;只补 skill 没有的别名(如 `--rule-2`) |
| `border-radius` | 控件非 50% 一律 `var(--radius)`(4px);**单独的 `0` 也映射为 `var(--radius)`**(旧 hack 把它压成了小圆角);多值里的 `0` 保留。卡片类容器改用 `var(--radius-card)`,见 3b;控件高度见 3c |
| `font-weight` | ≥600 → 700;≤500 → 400;**`b`/`strong` 上的 500 → 700**(那是强调,不是标题) |
| `font-size` | 吸附到字阶(<12→12;<20 平局向上,≥20 平局向下) |
| `letter-spacing` | 全部删除 |
| `text-transform:uppercase` | 全部删除。导航分组、表头、eyebrow 的 HTML 文案本来就是首字母大写,只是样式在转;删掉后表头和分组标题加 `font-weight:700` 保持层级 |
| 数据里的全大写值(`SUCCESS`、`HIGH`、`UNCONFIRMED`) | 在 JS 源码里**整体**替换成首字母大写,比较和显示同步变化;**不要**只在显示处转换,漏一处就会出现大写。替换前确认这些词没有作对象键、属性访问、正则或 CSS 类名用 |
| `opacity` | 吸附到 1 / .74 / .6 / .38 |
| `backdrop-filter`、半透明玻璃底 | 删除,用实色 `var(--surface)` |
| 写死的颜色 | 逐个映射到令牌(状态色、勋章色、遮罩 `rgb(0 0 0 / .5)`) |
| 全局 `border-radius !important` | 删除;在最前面放 `:where(*){border-radius:var(--radius)}` 作为默认,圆形元素显式写 `50%` |

> 旧的"全局 2px"hack 会把本该是圆点的元素(状态指示点、结论图标)压成方块。去掉 hack 后它们恢复成圆形,这是修复而不是回归。

### 3. 换字体、logo、补主题切换

- 内联 `MB Text` 的 woff2(只内嵌页面用到的族)。删除 Google Fonts 链接。
- 用 `assets/brand/mb-star.svg` 的路径内联到品牌区,`fill="currentColor"`。
- 原型没有主题切换就补一个按钮(**注意手机顶栏的网格列数**,多一个按钮会把头像挤到下一行)。
- 搜索框等定宽容器:文字包一层 `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`,因为 MB Text 比常见回退字体略宽,会折行撑高顶栏。

### 3b. 容器圆角、轻边线与间距(在第 2 步之后做)

1. **列出容器**:用脚本在全部页面和页签里扫描"有边线或背景、宽 ≥ 240、高 ≥ 56、有多个子元素"且仍是 2px 的元素,逐个判断是容器(卡片、面板、表格容器、KPI 条、详情头部、表单分组、弹窗)还是容器内部的行/分格。内部元素保持 2px。
2. **追加一个覆盖块**放在样式最后:容器 `border-radius:var(--radius-card)`;亮色 `border-color:var(--rule-soft)` + `box-shadow:var(--shadow-card)`;弹窗用 `--shadow-lg`。
3. **间距吸附**:把 `padding / margin / gap / row-gap / column-gap` 里的 px 值就近吸附到刻度 `0 1 2 4 6 8 12 16 20 24 32 40 48 64`(平局向上),CSS 和 JS 里的行内 `style=""` 一起处理;负值和 `calc()` 不动。再对容器显式写 16 / 16×24,不要让 18 变成 20。
4. **用 `--surfaces` 告诉验收脚本**哪些类是容器,例如 `--surfaces ".tablewrap,.dhead,.queue"`。

迁移中踩过的三个坑:

- **优先级被盖住**:原型里有 `.dash .kpis`、`.dash .queue`、`.dash-recon .stats` 这类更具体的选择器,覆盖块里只写 `.kpis` 不生效。写完覆盖块后必须重新扫描一遍确认。
- **别给靠子项边线分隔的条加背景**:`.stats` 是 1px 间隙拼出的格子,背景就是线色,可以改成 `--rule-soft`;`.kpis` 靠子项 `border-right` 分隔,给它加背景在暗色下会整块变灰。
- **用文本定位去替换令牌时,锚点必须唯一**:我用令牌文件的第一行 `/*` 做锚点,它在文件前部就命中了,把内嵌字体声明一起替换掉了。lint 和功能测试都通过了,只有渲染验收报出"没有字体加载",字体回退到系统字体后肉眼才看得出来。替换脚本里要断言 `@font-face` 数量不变。

### 3c. 统一控件高度、字号和圆角(在 3b 之后做)

先量,再改。用脚本遍历全部页面,收集 `button、select、input、.seg、.tab` 等控件的 **高度 / 圆角 / 字号 / 字重**,按选择器分组打印。CMP v4 的变更列表页同页就有 23、31、32、35、36、48 六七种高度。

目标:控件一律 `--control-h` 32px、14px、`--radius`;表格里的小按钮也用 32,不要另开 24。

**改法:删源头,再放一个统一覆盖块。** 只在末尾叠覆盖会输给后面这些东西,必须先清掉:

- **`!important` 的"紧凑"规则**:CMP 里有一条 `.seg button, .btn.sm { font-size: 12px !important }`,覆盖块写 14 也无效。直接从选择器列表里删掉这两项。
- **带限定的选择器**:`.facets select`、`.calfilter input`、`.cal-pager .plainsel`、`.facet-service` 自带 `padding:6px 8px; font-size:12px`,比 `select{}` 更具体。用 PostCSS 或正则把这些规则里的 `padding` 和 `font-size` 删掉。
- **通用的输入框底色规则**:`input:not([type=checkbox]):not([type=radio]){background:var(--surface-2)}` 给搜索框内层原生输入框强加了底色,造成"框里套框"。覆盖时选择器要写成 `.search input:not([type="checkbox"]):not([type="radio"])` 才压得住。
- **没有类名的原生控件**:日历页的 `<input type="datetime-local">` 没有 class,覆盖块要单独写 `input[type=date],input[type=datetime-local]`。

覆盖块之后用 `check-render.mjs --controls ".view,..."` 验收,它会列出所有不是 24 / 32 / 40 的控件。不要靠肉眼,CMP 这次是靠这条检查才发现日历页的日期框还是 34px。

**下拉框**:原生下拉的箭头占在右内边距里,原型里右边距只有 8(表单里 12),文字和箭头之间是 0px,顶栏下拉的左边距还是 8,和别处 12 不一致。统一成 `select:not([multiple]){appearance:none;padding:0 32px 0 12px;background-image:var(--icon-chevron);…}`。注意 `.facets select`、`.rolesel select` 这类带限定的规则自带 `background:` 简写,会把箭头图片重置掉,覆盖块要放在最后、选择器不能比它们弱。

**表格状态色条**:`td.sev{padding:0}` 会被 `table.grid td{padding:…}` 盖掉,色条因此离边缘 12px。写成 `table.grid td.sev{padding:0;position:relative;width:4px}`,里面的 `<i>` 绝对定位 `inset:0 auto 0 0`,宽 4px。

### 3d. 大小写(在 3c 之后做)

1. 删除所有 `text-transform:uppercase` 和对应的字距。
2. 用脚本在**全部角色、页面、页签、每条详情的每个页签**里扫描全大写单词。只扫首页和几个页面会漏掉大半,CMP 这次在设置页、详情的审批和审计页签里才找到 `HIGH`、`SUCCESS`。过滤掉缩写、HTTP 方法、等宽路径和命令。
3. 数据值整体替换。
4. **证明只改了大小写**:把新旧两版在所有状态下的页面文字取出,转小写后逐项比对,必须零差异。CMP 这次是 220 个状态,0 处差异,其中 67 个状态的大小写有变化。

`check-render.mjs` 会对渲染出的 `text-transform:uppercase` 直接失败,对全大写单词给警告(`--acronyms` 追加白名单),但它只看当前页面;跨页面扫描要自己遍历。

### 4. 回归验证:计算样式快照

对**新旧两个文件**用同一套脚本驱动页面,遍历:全部角色 × 全部页面 × 全部子页签 × 若干详情 × 弹层/抽屉/命令面板,桌面和手机两个宽度。对每个元素记录一组稳定属性(display、padding、margin、边框宽度、圆角、字号、字重、颜色、阴影…),按 DOM 顺序逐元素对比。

要点:
- 开启 `prefers-reduced-motion: reduce`,避免动画中途取值。
- 颜色统一用 **canvas 画 1 像素再读 RGBA** 转成 sRGB 后比较,允许少量误差;`ctx.fillStyle` 对 oklch 会原样返回字符串,不能用来归一化。
- `margin:auto` 的解析值、定时器驱动的 toast 是噪声,需要过滤。
- **快照范围要覆盖整个应用外壳**(导航、顶栏),不只是内容区。第一次只覆盖了内容区,漏掉了顶栏布局问题。
- 新增元素(主题按钮、logo 内部)在两边都跳过,保证 DOM 序列对齐。

差异应当只剩:字号吸附、字重规范化、勋章/状态色换成令牌、圆点恢复圆形。其余差异逐条查。

### 5. 渲染验收 + 人工看图

```bash
node scripts/lint-mb-style.mjs <新.html>
node scripts/check-render.mjs <新.html> --out shots \
  --views '@.navitem[data-go=today],@.navitem[data-go=changes],@[data-open]'
```

`--views` 以 `@` 开头表示"点击该选择器",用于没有 hash 路由的单页应用。**必须打开截图用眼睛看**:这次脚本全部通过时,搜索框折行和手机顶栏错位仍然存在。

## 迁移后 lint 仍可能出现的警告

| 警告 | 处理 |
|---|---|
| `opacity` 非四档 | 吸附 |
| `spacing` 越界 | 按 3b 吸附到刻度;lint 每个文件只输出一行汇总,列出越界值和次数 |
| 渲染验收报 `control height not 24/32/40` | 按 3c 清源头;若是自有控件类,用 `--controls` 加入检查;若是容器内的非控件(阶段卡片、图表块),不用管 |
| `hard-coded-color` | 映射令牌;**令牌定义本身(`--x:#hex`)不报** |
| `#88213` 之类 | 工单号被当颜色?lint 只匹配 3/4/6/8 位十六进制,5 位不会误报 |
