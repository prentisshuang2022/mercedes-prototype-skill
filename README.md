# mercedes-prototype

生成奔驰(Mercedes-Benz)风格的可交互 HTML 原型的 skill,面向 SRE、变更管理、运维后台和服务门户。默认左右结构(黑色左导航 + 浅色画布),规则来自真实的奔驰内部系统截图(SmartOps 门户、RC 入口页、发起流程表单)。

规则和流程见 [`SKILL.md`](SKILL.md)。

## 这个仓库里没有什么

这是一个**私有**仓库,以下两类内容**没有提交**:

| 内容 | 位置 | 原因 |
|---|---|---|
| MB Corpo 字体文件(6 个 `.woff2`) | `assets/fonts/` | 许可声明为 `Fonts for Daimler AG use only`,本仓库不授予任何使用或转授权权利 |
| 奔驰内部系统的参考截图 | `references/images/` | 可能含内部账号和链接信息 |

没有字体文件时,`scripts/scaffold.mjs` 会给出提示并退出,不会生成半成品。

## 安装

1. 克隆到项目的 skill 目录,例如:
   ```bash
   git clone git@github.com:prentisshuang2022/mercedes-prototype-skill.git .agents/skills/mercedes-prototype
   ```
2. **补回字体**(必须):把你**有授权**的 6 个文件放进 `assets/fonts/`,文件名和来源见 [`references/font-sources.json`](references/font-sources.json),可用其中的 `sha256` 核对。需要的 6 个文件:
   - `MBCorpoSText-Regular-Web.woff2`
   - `MBCorpoSText-Bold-Web.woff2`
   - `MBCorpoSTitle-Light-Web.woff2`
   - `MBCorpoSTitle-Bold-Web.woff2`
   - `MBCorpoATitleCond-Regular-Web.woff2`
   - `MBCorpoATextCond-Regular-Web.woff2`

   默认只会用到前两个(`MB Text` 400 / 700),其余是可选的品牌标题字。官方品牌资源入口:https://brand-design.mercedes-benz.com/
3. 在 OpenCode 里从项目根目录启动,用 `@mercedes-prototype` 调用。

## 用法

需要 Node 22 或更高版本;渲染验收需要本机装有 Chrome。

```bash
node scripts/scaffold.mjs <输出目录>            # 生成原型骨架(目录版)
node scripts/scaffold.mjs <输出目录> --single   # 单文件版,字体内嵌
node scripts/lint-mb-style.mjs <目录或文件>      # 静态检查
node scripts/check-render.mjs <index.html> --out <截图目录>   # 无头 Chrome 渲染验收
```

## 目录

```
SKILL.md              入口:核心规则与流程
assets/               样式令牌与组件、起始模板、组件样张、logo
references/           设计原则、字体、布局与组件、检查清单、迁移文档、真实界面实测值
scripts/              scaffold · lint · check-render
```

## 关于 logo

`assets/brand/mb-star.svg` 是用户提供的官方星徽(白色版,仅用于深色底)。对外交付前请确认项目具备标识使用授权。
