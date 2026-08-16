# 土豆 AI 短剧

> API Key 申请地址：[https://api.aitudou.net/](https://api.aitudou.net/)

一个面向短剧创作的本地桌面工作台，覆盖剧本生成、角色/场景/道具资产、分镜设计、视频碎片和资源管理。

## 效果预览

### 首页

<p align="center">
  <img src="https://github.com/AICoderTudou/TatoJu/blob/main/demo/home.png" alt="土豆 AI 短剧首页" width="100%" />
</p>

### 风格库

<p align="center">
  <img src="https://github.com/AICoderTudou/TatoJu/blob/main/demo/ScreenShot_2026-08-16_131520_716.png" alt="风格库与风格圣经" width="100%" />
</p>

### 分镜工作台

<p align="center">
  <img src="https://github.com/AICoderTudou/TatoJu/blob/main/demo/storyboard.jpg" alt="分镜工作台" width="100%" />
</p>

本仓库是纯净开源版：

- 不包含登录、账号、VIP、会员或积分逻辑。
- 项目数据与 API Key 保存在本机。
- 内置 74 套视觉风格及对应封面资源。
- 首页案例图、风格图和生成图片均支持预览与下载。
- 未配置真实服务时，可使用 mock 能力体验主要工作流。

## 功能

- 新建、打开和删除短剧项目。
- 随机生成剧本，或导入文本进行结构化解析。
- 从剧本提取角色、场景和道具，并维护参考图。
- 生成镜头表、分镜提示词、分镜图和视频提示词。
- 生成并管理视频碎片。
- 任务队列、生成进度、失败重试与取消。
- 项目资源中心、图片预览与下载。
- 全局模型、生成服务、默认画幅和并发数设置。

## API Key

应用每次启动会显示算力服务提示。点击“前往申请”会使用系统默认浏览器打开：

[https://api.aitudou.net/](https://api.aitudou.net/)

申请后在应用的“全局设置”中填写所需 API Key。当前设置页支持阿里百炼、RunningHub、GPT Image 和 Seedance 等服务；具体需要哪些 Key 取决于你选择的生成服务。

## 本地运行

环境要求：Node.js 20 或更高版本、npm 10 或更高版本。

```bash
npm install
npm run rebuild
npm run dev
```

中国大陆网络环境可在安装 Electron 前配置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install
```

## 验证与构建

```bash
npm run typecheck
npm run build
npm run selftest
npm run smoke
npm run dist
```

`selftest` 使用隔离数据目录和 mock 生成服务，不会消耗图片或视频生成额度。

## 数据与隐私

- 项目数据位于应用的本地用户数据目录。
- API Key 使用系统安全存储能力加密后落盘，渲染界面只能读取“是否已配置”状态。
- 应用没有登录、会员或远程账号依赖。
- 启动弹框只在用户点击按钮后打开上述 HTTPS 申请地址。

## 许可证

[MIT](LICENSE)
