# Axolotl Launcher 变更日志可视化

基于 GitHub Releases API 数据，支持 10 种图表类型、3 种分析视角的交互式可视化工具。

## 技术栈

- **后端**：Go 1.21（标准库 net/http，零依赖）
- **前端**：原生 HTML/CSS/JavaScript + Apache ECharts 5.5
- **CI/CD**：GitHub Actions（Windows/Linux/macOS 矩阵构建）

## 功能

- **10 种图表类型**：条形图、堆叠图、雷达图、折线图、面积图、堆叠面积图、直方图、箱线图、散点图、气泡图
- **3 种分析视角**：版本改动图、版本分布图、版本更新速度图
- **交互式**：点击图表顶点查看对应版本的完整更新日志
- **自定义**：配色方案（默认/暖色/冷色/深色）、字号（小/中/大）
- **全平台**：Go 编译为原生二进制，Windows exe / Linux / macOS .app

## 快速开始

### 本地运行

```bash
go build -o axolotl-changelog-viewer ./cmd/server
./axolotl-changelog-viewer
# 浏览器打开 http://127.0.0.1:8765/index.html
```

### 开发模式

```bash
go run ./cmd/server
```

## GitHub Actions 构建

推送到 GitHub 后自动触发跨平台构建：

| 平台 | 架构 | 产物 |
| --- | --- | --- |
| Windows | amd64 | `axolotl-changelog-viewer-windows-amd64.exe` |
| Windows | arm64 | `axolotl-changelog-viewer-windows-arm64.exe` |
| Linux | amd64 | `axolotl-changelog-viewer-linux-amd64` + AppImage |
| Linux | arm64 | `axolotl-changelog-viewer-linux-arm64` |
| macOS | amd64 | `AxolotlChangelogViewer-amd64.app` |
| macOS | arm64 | `AxolotlChangelogViewer-arm64.app` |

## 项目结构

```
├── cmd/server/main.go          # 入口
├── internal/server/server.go   # HTTP 服务器 + MD 解析器
├── web/                        # 前端（HTML/CSS/JS/ECharts）
├── data/changelog.json         # 结构化数据
├── docs/changelog.md           # 变更日志源文档
└── .github/workflows/build.yml # CI/CD
```

## 图表类型与分析视角

版本改动图、版本分布图、版本更新速度图属于**分析视角**，不是独立图表类型。
每种分析视角可以用任意一种图表类型来渲染展示，用户可自由切换。

## 平台分发说明

### Windows
- exe 可能触发 SmartScreen，用户可手动保留
- 长期方案：代码签名

### Linux
- AppImage 单文件免安装
- 首次运行：`chmod +x 应用.AppImage`

### macOS
- .app Bundle 调用系统 Web 渲染
- 首次打开：右键 → 打开，或系统设置 → 隐私与安全性
