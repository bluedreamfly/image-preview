# Image Preview

一个VSCode扩展插件，可以在鼠标悬停在图片链接上时预览图片。

## 功能特性

- ✨ 支持在代码中hover预览图片URL
- 🖼️ 支持多种图片格式：PNG, JPG, JPEG, GIF, BMP, SVG, WEBP, ICO
- 🌐 支持HTTP/HTTPS远程图片链接
- 📁 支持相对路径和绝对路径的本地图片
- 🎯 **支持自定义资源标识符映射**（如 `__ASSET_3232_234234`）
- ⚙️ 可配置预览图片的最大宽度和高度
- 🔄 自动监听配置文件变化，实时更新映射

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

## 资源标识符映射（新功能）

插件支持使用自定义的资源标识符来引用图片，格式为 `__ASSET_数字_数字`。

### 配置资源映射

在项目根目录创建 `.image-assets.json` 文件：

```json
{
  "__ASSET_3232_234234": "https://via.placeholder.com/300.png",
  "__ASSET_1001_100001": "https://example.com/avatar.png",
  "__ASSET_3003_300003": "./assets/logo.png"
}
```

### 使用资源标识符

```javascript
// 在代码中使用
const avatar = "__ASSET_3232_234234";

// React组件中
<img src="__ASSET_1001_100001" />

// 配置对象中
const config = {
  logo: "__ASSET_3003_300003"
};
```

将鼠标悬停在资源标识符上，插件会：
1. 查找对应的图片URL映射
2. 显示图片预览
3. 显示资源ID和解析后的URL

### 配置文件位置

插件会按以下顺序查找配置文件：
1. 自定义路径（通过设置 `imagePreview.assetMappingPath` 指定）
2. `.image-assets.json`（项目根目录）
3. `assets.config.json`（项目根目录）
4. `.vscode/image-assets.json`

### 重新加载映射

修改配置文件后：
- 插件会自动检测并重新加载
- 也可以手动执行命令：`Image Preview: Reload Asset Mappings`

## 配置选项

在VSCode设置中可以配置以下选项：

- `imagePreview.maxWidth`: 预览图片的最大宽度（像素），默认400
- `imagePreview.maxHeight`: 预览图片的最大高度（像素），默认400
- `imagePreview.assetMappingPath`: 自定义资源映射配置文件路径（相对于工作区根目录）

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
