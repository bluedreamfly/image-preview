# Image Preview

一个VSCode扩展插件，可以在鼠标悬停在图片链接上时预览图片。

## 功能特性

- 支持在代码中hover预览图片URL
- 支持多种图片格式：PNG, JPG, JPEG, GIF, BMP, SVG, WEBP, ICO
- 支持HTTP/HTTPS远程图片链接
- 支持相对路径和绝对路径的本地图片
- 可配置预览图片的最大宽度和高度

## 使用方法

1. 在代码中写入图片链接（可以是字符串、Markdown链接等）
2. 将鼠标悬停在图片URL上
3. 即可看到图片预览

### 示例

```javascript
// JavaScript/TypeScript
const imageUrl = "./images/logo.png";
const remoteImage = "https://example.com/image.jpg";
```

```markdown
<!-- Markdown -->
![Alt text](./images/screenshot.png)
```

```html
<!-- HTML -->
<img src="../assets/banner.jpg" />
```

```css
/* CSS */
background-image: url('./background.png');
```

## 配置选项

在VSCode设置中可以配置以下选项：

- `imagePreview.maxWidth`: 预览图片的最大宽度（像素），默认400
- `imagePreview.maxHeight`: 预览图片的最大高度（像素），默认400

## 开发和调试

### 安装依赖

```bash
npm install
```

### 编译

```bash
npm run compile
```

### 运行和调试

1. 在VSCode中打开此项目
2. 按F5启动调试
3. 在新打开的VSCode窗口中测试插件功能

### 打包

```bash
npm run vscode:prepublish
```

## 支持的图片格式

- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- BMP (.bmp)
- SVG (.svg)
- WebP (.webp)
- ICO (.ico)

## 路径解析规则

1. HTTP/HTTPS URL - 直接使用远程地址
2. 相对路径（如 `./images/pic.png`）- 相对于当前文件目录
3. 相对路径（如 `/images/pic.png`）- 相对于工作区根目录
4. 绝对路径 - 使用系统绝对路径

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！
