# 首页素材放置位置（public/）

这个目录里的文件会被原样拷贝到打包产物，前端用相对路径即可访问。

## 1. 首页背景视频（循环播放）
把视频命名为 **`hero-bg.mp4`** 放到本目录：

```
public/hero-bg.mp4
```

- 放好后首页 Hero 背景会自动循环播放该视频；不存在时自动回退到内置的霓虹渐变背景。
- 建议：横屏 16:9、≤ 20MB、静音、时长 8–15s 可无缝循环的片段。
- 也支持 `.webm`（同时把 Projects.vue 里 `bgVideo` 的扩展名改成 .webm 即可）。

## 2. 案例海报（横向滚动墙）
把竖版海报（2:3）放到 `public/cases/`：

```
public/cases/case1.jpg
public/cases/case2.jpg
...
```

然后在 `src/views/Projects.vue` 的 `cases` 数组里，给对应项填上 `poster: './cases/case1.jpg'`（开发期用 `/cases/case1.jpg`）。填了 poster 就显示真实海报，没填则显示渐变占位。
