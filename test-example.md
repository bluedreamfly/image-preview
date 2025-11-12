# 图片预览插件测试示例

## 使用说明

将鼠标悬停在下面的图片链接上，即可预览图片。

## 示例

### 1. Markdown格式
```markdown
![示例图片](https://picsum.photos/400/300)
```

### 2. HTML格式
```html
<img src="https://picsum.photos/300/200" alt="Random Image" />
```

### 3. JavaScript字符串
```javascript
const imageUrl = "https://picsum.photos/500/400";
const localImage = "./assets/logo.png";
```

### 4. CSS背景图
```css
background-image: url('https://picsum.photos/600/400');
```

### 5. 相对路径示例
```
./images/screenshot.png
../assets/banner.jpg
/public/logo.png
```

### 6. 远程图片URL
- https://picsum.photos/400/300
- https://via.placeholder.com/350x150
- https://dummyimage.com/600x400/000/fff

## 测试不同的图片格式

- PNG: https://picsum.photos/400/300.png
- JPG: https://picsum.photos/400/300.jpg
- WebP: https://picsum.photos/400/300.webp

## 注意事项

1. 确保图片路径正确
2. 本地图片需要确保文件存在
3. 远程图片需要网络连接
