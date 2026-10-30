# Axolotl Launcher 变更日志可视化

基于 GitHub Releases API 数据，支持 10 种图表类型、3 种分析视角的交互式可视化工具。

## 功能

- **10 种图表类型**：条形图、堆叠图、雷达图、折线图、面积图、堆叠面积图、直方图、箱线图、散点图、气泡图
  - 注：原需求中的「贝塔图」未实现（含义待确认），当前为 10 种
- **3 种分析视角**：版本改动图、版本分布图、版本更新速度图
- **交互式**：点击图表顶点查看对应版本的完整更新日志
- **自定义**：配色方案（默认/暖色/冷色/深色）、字号（小/中/大）
- **全平台**：HTML 页面，所有浏览器可运行

## 数据

- 来源：`docs/changelog.md`（103 个 Release，v1.0.0 → v1.10.3）
- 解析：`parser.py` 将 Markdown 转为 `data/changelog.json`

## 快速开始

### 方式一：单 HTML 文件（最简单）

直接双击 `Axolotl-Changelog-Viewer.html` 在浏览器中打开，无需服务器。

### 方式二：本地服务器

```bash
python parser.py              # 解析 MD → JSON（首次或数据更新时）
python -m http.server 8765    # 启动服务器
# 浏览器打开 http://127.0.0.1:8765/index.html
```

### 方式三：Windows exe

```bash
# 在 Windows 上构建
pyinstaller build.spec --clean --noconfirm
# 运行 dist\AxolotlChangelogViewer.exe
```

### 方式四：Linux AppImage

```bash
# 在 Linux 上构建
chmod +x build_linux.sh
./build_linux.sh
# 运行 ./AxolotlChangelogViewer-linux-x86_64.AppImage
# 首次运行需赋予执行权限：chmod +x AxolotlChangelogViewer-linux-x86_64.AppImage
```

### 方式五：macOS .app Bundle

```bash
# 在 macOS 上构建
chmod +x build_macos.sh
./build_macos.sh
# 运行 AxolotlChangelogViewer.app
# 首次打开可能被 Gatekeeper 拦截：右键 → 打开，或系统设置 → 隐私与安全性
```

## 平台分发说明

### Windows
- 格式：exe（PyInstaller 打包，约 11MB）
- SmartScreen 提示：发布说明中说明用户可手动保留或解除锁定
- 长期方案：代码签名

### Linux
- 格式：AppImage，单文件、免安装、双击运行
- 首次运行需赋予执行权限：`chmod +x 应用.AppImage`

### macOS
- 格式：.app Bundle，双击运行，调用系统 Web 渲染，不内置完整浏览器
- 首次打开可能被 Gatekeeper 拦截：右键打开或系统设置放行

## 图表类型与分析视角关系

版本改动图、版本分布图、版本更新速度图属于**分析视角**，不是独立图表类型。
每种分析视角可以用任意一种图表类型来渲染展示，用户可自由切换。

## 项目结构

```
Axolotl-Changelog-Viewer/
├── index.html              # 主页面
├── src/
│   ├── echarts.min.js      # ECharts 图表库（本地化）
│   ├── styles.css          # 样式
│   └── app.js              # 应用逻辑
├── data/
│   └── changelog.json      # 结构化数据
├── docs/
│   └── changelog.md        # 变更日志源文档
├── Axolotl-Changelog-Viewer.html  # 自包含单 HTML（离线可用）
├── launcher.py             # Python 启动器
├── build.spec              # PyInstaller 配置
├── build_linux.sh          # Linux AppImage 构建脚本
├── build_macos.sh          # macOS .app 构建脚本
├── build_single.py         # 生成自包含单 HTML
└── parser.py               # MD → JSON 解析器
```

## 技术栈

- 图表：Apache ECharts 5.5
- 前端：原生 HTML/CSS/JavaScript（无框架依赖）
- 打包：PyInstaller（Windows）、appimagetool（Linux）、标准 .app Bundle（macOS）
