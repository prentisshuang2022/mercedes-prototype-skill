# 字体

## 1. 随包字体(`assets/fonts/`,woff2)

**默认只用 `MB Text`**:真实 CMP / SmartOps Portal 的标题是常规到中等字重的普通无衬线,实测对比后 `MB Text` 400 / 700 最贴近。另外两个品牌字作为可选,不是默认。

| 文件 | 复合族 | 字重 | 外观(已实测渲染) | 定位 |
|---|---|---|---|---|
| `MBCorpoSText-Regular/Bold-Web` | `MB Text` | 400 / 700 | 人文无衬线 | **默认**:正文、标题、KPI、品牌名 |
| `MBCorpoATitleCond-Regular-Web` | `MB Title` | 400 | 压缩**衬线**体,奔驰官网大标题字 | 可选:品牌展示、营销页 |
| `MBCorpoSTitle-Light/Bold-Web` | `MB Title Sans` | 300 / 700 | 轻量无衬线,300 偏细 | 可选:想要更轻的大标题 |
| `MBCorpoATextCond-Regular-Web` | 未接入 | 400 | 压缩衬线正文 | 不用于后台 |

只打包 woff2(所有现代浏览器支持,体积约为 woff 的一半)。来源与 SHA-256 见 `font-sources.json`,原包说明见 `assets/fonts/NOTICE.txt`。

## 2. 许可

字体内嵌许可原文:**Fonts for Daimler AG use only**。版权属 Daimler AG,制造商 Edenspiekermann / URW Type Foundry。本 skill 只是保留并复用已有文件,**不授予任何使用或转授权权利**。对外交付、对外发布前确认项目具备授权;官方资源入口 https://brand-design.mercedes-benz.com/ 。

## 3. 复合族:为什么不能只写 fallback

MB Corpo 不含汉字。如果写成 `font-family: "MB Corpo S Text Web", "PingFang SC"`,浏览器只在缺字时回退,中文字重、字面、字号完全失控,各平台还不一致。

`assets/css/mb-fonts.css` 用 `@font-face` + `unicode-range` 组成复合族:拉丁段指向 MB Corpo,汉字段指向配对黑体(思源黑体 → Noto Sans SC → 苹方 → 微软雅黑)。

- **标题面**(`MB Title`、`MB Title Sans`)的汉字 `size-adjust: 94%`。压缩体字面窄,方块汉字同字号显得更大更重,不补偿则中文"压住"英文。默认的 `MB Text` 不做 `size-adjust`。
- **正文面**不做 `size-adjust`。12px 的小标题和说明文字再缩会跌破中文可读下限。
- 破折号 `U+2014`、省略号 `U+2026` 划归汉字面,其余通用标点留给拉丁面。
- 汉字面必须声明在拉丁面**之后**(后声明者在其 unicode-range 内优先)。

## 4. `local()` 陷阱(已踩坑并修复)

`local()` 按字体的**全名**或 **PostScript 名**匹配,**不是家族名**。Chrome/macOS 实测:

| 写法 | 结果 |
|---|---|
| `local("PingFang SC")` | 失效 |
| `local("PingFang SC Regular")` / `local("PingFangSC-Regular")` | 可用 |
| `local("PingFangSC-Semibold")` / `local("PingFang SC Semibold")` | 可用 |
| `local("Microsoft YaHei")` / `local("Microsoft YaHei Bold")` | Windows 可用 |

失效时中文仍会通过普通回退链显示,但**没有 `size-adjust`**,标题里中文会偏大,肉眼不易察觉。所以 `mb-fonts.css` 每个汉字面都写全了全名和 PostScript 名。新增字体面时照此写。`check-render.mjs` 在汉字面没有本机匹配时会给出 WARN。

## 5. 用法

```css
body            { font-family: var(--font-text); }     /* MB Text + 汉字面 */
h1, .page-title { font-family: var(--font-display); font-weight: 400; }  /* 默认 = MB Text */
.mono           { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
```

切换到品牌压缩衬线或轻体标题(整站一行):

```css
:root { --font-display: var(--font-display-serif); }   /* MB Title 400,压缩衬线 */
:root { --font-display: var(--font-display-light); }   /* MB Title Sans;标题 font-weight 改为 300 */
```

`MB Title` / `MB Title Sans` 的字体文件不会被浏览器下载,除非页面真的用到它们。`scaffold.mjs --single` 只内嵌页面引用到的字体族(默认只内嵌 `MB Text`,约 177 KB)。`--font-display-light` 的 300 是仅有的合法例外字重,lint 在该语境下放行。

## 6. 规则

- 字重只用 400 / 700。500、600 没有真实字面,浏览器会合成,不要写。
- h1–h4 用 `--font-display` 且保持 400;h5/h6 用 `MB Text` + 700。
- 数字(KPI、编号、时间)加 `font-variant-numeric: tabular-nums`;编号和时间可用 `--font-data`。
- 不用 `transform: scaleX()` 压字形;不用图片代替文字。
- 不依赖 `local("MB Corpo")` 加载 MB 字体(内部名称是通用 `Font`),一律走 `url()`。
- 单文件交付时按需内嵌 woff2(`scaffold.mjs --single` 自动处理,并保留许可声明)。

## 7. 验证

渲染后等待 `document.fonts.ready`,确认实际用到的 `FontFace.status === "loaded"`。只看 computed `font-family` 不能证明字体加载成功。`scripts/check-render.mjs` 已包含这项检查。
