# 快速开始指南

## 功能概述

这个VSCode插件支持两种图片预览方式：

### 1. 直接预览图片URL
直接将鼠标悬停在图片URL上即可预览。

### 2. 资源标识符映射预览（新功能）
使用 `__ASSET_数字_数字` 格式的标识符，通过配置文件映射到真实的图片URL。

## 安装插件

```bash
code --install-extension image-preview-1.0.0.vsix
```

或在VSCode中：
1. `Cmd/Ctrl + Shift + P`
2. 选择 `Extensions: Install from VSIX...`
3. 选择 `image-preview-1.0.0.vsix`

## 测试步骤

### 第一步：测试普通图片URL

1. 打开 `test-png-images.md` 文件
2. 将鼠标悬停在任何图片URL上（如 `https://via.placeholder.com/300.png`）
3. 查看图片预览

### 第二步：测试资源标识符

1. 确保项目根目录有 `.image-assets.json` 配置文件
2. 打开 `test-asset-identifiers.md` 文件
3. 将鼠标悬停在 `__ASSET_3232_234234` 等标识符上
4. 查看图片预览和映射信息

### 第三步：测试React/TSX文件

1. 打开 `examples/ImageGallery.tsx` 文件
2. 将鼠标悬停在各种图片URL上测试

## 配置资源映射

### 创建配置文件

在项目根目录创建 `.image-assets.json`：

```json
{
  "__ASSET_3232_234234": "https://via.placeholder.com/300.png",
  "__ASSET_1001_100001": "https://www.kasandbox.org/programming-images/avatars/spunky-sam.png",
  "__ASSET_2002_200002": "https://www.gstatic.com/webp/gallery3/1.sm.png",
  "__ASSET_3003_300003": "./assets/logo.png"
}
```

### 使用资源标识符

在任何代码文件中：

```javascript
// JavaScript
const avatar = "__ASSET_3232_234234";

// TypeScript
const imageUrl: string = "__ASSET_1001_100001";

// React/TSX
<img src="__ASSET_2002_200002" />

// 配置对象
const config = {
  headerImage: "__ASSET_3003_300003"
};
```

## 重新加载配置

修改 `.image-assets.json` 后：

**方法1：自动重新加载**
- 保存文件后插件会自动检测并重新加载

**方法2：手动重新加载**
1. `Cmd/Ctrl + Shift + P`
2. 运行 `Image Preview: Reload Asset Mappings`

## 插件设置

在VSCode设置中搜索 `imagePreview`：

```json
{
  "imagePreview.maxWidth": 400,
  "imagePreview.maxHeight": 400,
  "imagePreview.assetMappingPath": ""  // 可选：自定义配置文件路径
}
```

## 支持的场景

✅ JavaScript/TypeScript字符串
✅ React/Vue组件
✅ HTML标签
✅ CSS样式
✅ Markdown文档
✅ JSON配置文件
✅ 引号内的路径
✅ 括号内的路径

## 故障排除

### 资源标识符没有预览？

1. 检查 `.image-assets.json` 文件是否存在
2. 检查JSON格式是否正确
3. 检查资源ID是否匹配
4. 尝试手动重新加载映射

### 本地图片找不到？

1. 检查路径是否正确
2. 尝试使用相对路径（`./` 或 `../`）
3. 检查文件是否真实存在

### 远程图片无法加载？

1. 检查网络连接
2. 检查URL是否正确
3. 确保URL以图片扩展名结尾

## 调试模式

按 `F5` 启动调试：
1. 新窗口会打开（扩展开发主机）
2. 打开控制台查看日志
3. 测试所有功能

## 示例文件

- `test-png-images.md` - PNG图片URL测试
- `test-asset-identifiers.md` - 资源标识符测试
- `test-example.md` - 综合示例
- `examples/ImageGallery.tsx` - React/TSX示例

祝使用愉快！
