# 验收清单

交付前逐项核对。能脚本化的已在 `scripts/` 里,标了 🤖;其余需要人眼看截图。

## A. 自动检查

```bash
node scripts/lint-mb-style.mjs <输出目录或文件>                       # 🤖 静态:圆角/字重/令牌层/CDN/scaleX
node scripts/check-render.mjs <index.html> --views a,b --out ./shots  # 🤖 渲染:字体加载/报错/溢出/圆角/字重 + 明暗窄屏截图
#   自有容器类名不同时追加:--surfaces ".dhead,.tablewrap,.queue"(这些类允许 8px);自有控件类追加:--controls ".view,.chip"(这些类必须 24/32/40 高)
#   --views 默认是 hash 路由;单页应用用 "@<选择器>" 表示点击,如 --views '@.navitem[data-go=changes]'
```

两个脚本都以退出码 1 表示失败。`check-render.mjs` 需要 Chrome(设 `CHROME_PATH` 可指定)和 Node ≥ 22。

## B. 令牌与风格

- [ ] 🤖 业务 CSS 无 `var(--color-brand-*)`,无散落的十六进制色值
- [ ] 🤖 圆角:控件 4px;8px 只在卡片类容器(`.card .panel .table-wrap .modal .tile`,自有容器用 `--surfaces` 追加);16px 只在 `.group`;`.search-pill` 胶囊;状态点/头像/客服按钮 50%
- [ ] 🤖 控件高度只有 24 / 32 / 40(按钮、输入、下拉、日期框、`.omni`、`.seg`、标签页;自有控件类用 `--controls` 追加),同页不出现 35、36、48
- [ ] 🤖 没有强制大写(`text-transform:uppercase` 渲染验收会失败);🤖 没有全大写单词(警告);状态值、风险值、导航分组、表头、徽标都是首字母大写,只有真缩写保持大写
- [ ] 控件字号统一 14;搜索框是单层 32px,不是外框套输入框
- [ ] 🤖 下拉框 `appearance:none`、左内边距 ≥ 12、右内边距 ≥ 28,文字不贴箭头;所有下拉左右内边距一致(含顶栏)
- [ ] 表格状态色条贴着容器左边缘、通栏,不浮在单元格内边距里
- [ ] 🤖 间距在刻度内(lint 的 `spacing` 警告为 0);容器内边距 16,卡片网格列距 16、行距 24
- [ ] 容器亮色用 `--rule-soft` + `--shadow-card`,暗色无阴影、描边为 `--rule`;容器内层元素圆角比外层小
- [ ] 🤖 字重只有 400/700;标题用 `--font-display`(默认 MB Text 400)
- [ ] 🤖 无外链字体 CDN,无 `scaleX`
- [ ] 青绿 `--accent-2` 只出现在搜索图标和客服按钮
- [ ] logo 用 `mb-star.svg`,放在黑色底上,未改色未变形
- [ ] 亮色按 `--ground → --surface-3 → --surface → --surface-2` 阶梯,白只用在控件和浮层
- [ ] 暗色背景/面板/控件同为 `#000`,靠描边分层,没有深灰面
- [ ] 次要信息用 `--ink-2/--ink-3`(透明度)而非新灰色
- [ ] 主蓝只用于主操作、选中、焦点;饱和色只出现在状态上
- [ ] 间距走 4/8/16/24/32/48 阶

## C. 字体

- [ ] 🤖 `MB Text 400/700` 的 `FontFace.status` 为 `loaded`(若启用了 `MB Title` / `MB Title Sans`,它们也要 loaded)
- [ ] 🤖 汉字面有本机匹配(否则 WARN:中文丢失 `size-adjust`)
- [ ] 中英混排的标题里,中文没有压住英文
- [ ] 数字列 `tabular-nums`,编号/时间等宽
- [ ] 交付物保留了 `Fonts for Daimler AG use only` 声明

## D. 布局与响应式

- [ ] 左导航 ~256px 黑 + 顶栏 54px + 浅色画布,与参考截图结构一致
- [ ] 🤖 390px 宽度无横向溢出;表格在自己的滚动容器内
- [ ] 窄屏导航可开关,Esc 可关,焦点不丢
- [ ] 长文本(服务名、中文标题)不撑破布局,换行或截断合理

## E. 交互与可访问性

- [ ] 搜索、页签、筛选改变结果;空结果有说明;禁用态清晰
- [ ] 详情抽屉/弹窗可用键盘打开、Esc 关闭
- [ ] 所有可聚焦元素有可见 `:focus-visible`
- [ ] 状态既有颜色又有文字;进度条有 `aria-label`
- [ ] 页面标注模拟数据;无真实接口调用、无外部请求

## F. 交付

- [ ] 入口 `index.html` + `css/` + `fonts/`(或 `--single` 单文件)
- [ ] 移动整个目录后仍能打开,没有回指 skill 目录的绝对路径
- [ ] 查看过明、暗、窄屏三张截图,截图只用于验收,不当交付物
- [ ] 没有浏览器时,在说明里写清哪些项**未验证**

## 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 中文标题偏大偏重 | 汉字面没匹配到本机字体,`size-adjust` 丢失 | 用全名/PostScript 名写 `local()`;见 `typography.md` |
| 标题变成了奇怪的字体 | MB Text 没加载,落到了 Source Sans / Arial | 查字体路径:`css/` 与 `fonts/` 必须同级 |
| 暗色下小蓝字看不清 | 暗色 primary 对比度约 4.3:1 | 小字用 `--accent-text` |
| 表头在亮色下发白 | 用了 `--surface-2` | 表头用 `--surface-3` |
| lint 报大量圆角 | 沿用了 `body * {border-radius:2px!important}` 的旧写法 | 组件直接用 `var(--radius)` |
