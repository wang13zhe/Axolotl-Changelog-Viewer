# Axolotl Launcher 变更日志可视化

基于 GitHub Releases API 数据，支持 10 种图表类型、3 种分析视角的交互式可视化工具。

## 功能

- **10 种图表类型**：条形图、堆叠图、雷达图、折线图、面积图、堆叠面积图、直方图、箱线图、散点图、气泡图
- **3 种分析视角**：版本改动图、版本分布图、版本更新速度图
- **交互式**：点击图表顶点查看对应版本的完整更新日志
- **自定义**：配色方案（默认/暖色/冷色/深色）、字号（小/中/大）
- **全平台**：HTML 页面，所有浏览器可运行

## 数据

- 来源：`docs/changelog.md`（103 个 Release，v1.0.0 → v1.10.3）
- 解析：`parser.py` 将 Markdown 转为 `data/changelog.json`

## 运行

```bash
python parser.py          # 解析 MD → JSON
python -m http.server 8765  # 启动本地服务器
# 浏览器打开 http://127.0.0.1:8765/index.html
```

## 打包计划

- [ ] Windows exe
- [ ] Linux AppImage
- [ ] macOS .app Bundle
