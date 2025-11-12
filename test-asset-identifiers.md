# 资源标识符测试

这个文件用于测试 `__ASSET_数字_数字` 格式的图片资源标识符。

## 配置说明

资源映射配置在 `.image-assets.json` 文件中定义。
将鼠标悬停在下面的资源标识符上即可预览对应的图片。

## 测试资源标识符

### 1. 在字符串中使用
```javascript
const avatar = "__ASSET_3232_234234";
const logo = "__ASSET_1001_100001";
const banner = "__ASSET_2002_200002";
```

### 2. 在配置对象中使用
```typescript
const imageConfig = {
  profile: "__ASSET_3232_234234",
  header: "__ASSET_1001_100001",
  background: "__ASSET_2002_200002"
};
```

### 3. React组件中使用
```tsx
<img src="__ASSET_3003_300003" alt="Logo" />
<div style={{ backgroundImage: `url(__ASSET_4004_400004)` }} />
```

### 4. 在数组中使用
```javascript
const images = [
  "__ASSET_3232_234234",
  "__ASSET_1001_100001",
  "__ASSET_2002_200002",
  "__ASSET_3003_300003",
  "__ASSET_4004_400004",
  "__ASSET_5005_500005"
];
```

### 5. 直接在文本中
将鼠标悬停在这些标识符上：
- __ASSET_3232_234234
- __ASSET_1001_100001
- __ASSET_2002_200002
- __ASSET_3003_300003

### 6. Markdown链接中
![Avatar](__ASSET_3232_234234)
![Logo](__ASSET_1001_100001)

### 7. 测试未映射的资源
这个资源没有在配置文件中定义，应该显示错误提示：
- __ASSET_9999_999999

## 重新加载资源映射

如果你修改了 `.image-assets.json` 文件，可以：
1. 使用命令面板 (Cmd/Ctrl + Shift + P)
2. 运行命令: `Image Preview: Reload Asset Mappings`

## 配置文件位置

插件会按以下顺序查找配置文件：
1. 自定义路径（在设置中配置）
2. `.image-assets.json`（项目根目录）
3. `assets.config.json`（项目根目录）
4. `.vscode/image-assets.json`

## 当前配置的资源

根据 `.image-assets.json` 文件，已配置的资源有：
- `__ASSET_3232_234234` → https://via.placeholder.com/300.png
- `__ASSET_1001_100001` → Khan Academy头像
- `__ASSET_2002_200002` → Google静态图片
- `__ASSET_3003_300003` → 本地logo
- `__ASSET_4004_400004` → 本地banner
- `__ASSET_5005_500005` → 占位符图片
