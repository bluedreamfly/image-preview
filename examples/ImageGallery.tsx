import React, { useState } from 'react';

/**
 * 图片画廊组件 - 用于测试图片预览插件
 * 将鼠标悬停在图片URL字符串上查看预览
 */

interface ImageItem {
  id: number;
  url: string;
  title: string;
  description: string;
}

const ImageGallery: React.FC = () => {
  // 图片数据
  const images: ImageItem[] = [
    {
      id: 1,
      url: "https://via.placeholder.com/300.png",
      title: "占位符图片",
      description: "300x300 placeholder image"
    },
    {
      id: 2,
      url: "https://www.gstatic.com/webp/gallery3/1.sm.png",
      title: "Google静态图片",
      description: "Small PNG from Google"
    },
    {
      id: 3,
      url: "https://www.kasandbox.org/programming-images/avatars/spunky-sam.png",
      title: "Sam头像",
      description: "Khan Academy avatar"
    },
    {
      id: 4,
      url: "https://www.kasandbox.org/programming-images/avatars/leaf-blue.png",
      title: "蓝叶头像",
      description: "Blue leaf avatar"
    }
  ];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 本地图片路径示例
  const localImages = {
    logo: "./assets/logo.png",
    banner: "../images/banner.png",
    icon: "/public/icon.png"
  };

  // 动态生成图片URL
  const generateImageUrl = (width: number, height: number): string => {
    return `https://via.placeholder.com/${width}x${height}.png`;
  };

  // 处理图片点击
  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    console.log(`Selected image: ${url}`);
  };

  return (
    <div className="image-gallery">
      <h1>图片画廊组件</h1>

      {/* 远程图片列表 */}
      <section className="remote-images">
        <h2>远程PNG图片</h2>
        <div className="image-grid">
          {images.map((image) => (
            <div key={image.id} className="image-card">
              <img
                src={image.url}
                alt={image.title}
                onClick={() => handleImageClick(image.url)}
              />
              <h3>{image.title}</h3>
              <p>{image.description}</p>
              {/* 悬停在下面的URL上可以预览图片 */}
              <code>{image.url}</code>
            </div>
          ))}
        </div>
      </section>

      {/* 本地图片路径示例 */}
      <section className="local-images">
        <h2>本地图片路径</h2>
        <ul>
          <li>Logo: <code>{localImages.logo}</code></li>
          <li>Banner: <code>{localImages.banner}</code></li>
          <li>Icon: <code>{localImages.icon}</code></li>
        </ul>
      </section>

      {/* 动态生成的图片 */}
      <section className="dynamic-images">
        <h2>动态生成的图片</h2>
        <div className="dynamic-grid">
          <img src={generateImageUrl(200, 150)} alt="Small" />
          <img src={generateImageUrl(300, 200)} alt="Medium" />
          <img src={generateImageUrl(400, 250)} alt="Large" />
        </div>
        {/* 测试：悬停在这些URL上 */}
        <p>URL示例: {generateImageUrl(500, 300)}</p>
      </section>

      {/* 内联样式中的背景图片 */}
      <section
        className="hero-section"
        style={{
          backgroundImage: `url('https://via.placeholder.com/1200x400.png')`,
          backgroundSize: 'cover',
          height: '400px'
        }}
      >
        <h2>背景图片示例</h2>
      </section>

      {/* CSS类名中引用的图片 */}
      <div className="profile-avatar">
        {/* 头像URL */}
        <img src="https://www.kasandbox.org/programming-images/avatars/starky.png" alt="Avatar" />
      </div>

      {/* 条件渲染的图片 */}
      {selectedImage && (
        <div className="selected-preview">
          <h3>选中的图片:</h3>
          <img src={selectedImage} alt="Selected" />
          <p>URL: {selectedImage}</p>
        </div>
      )}

      {/* 更多图片URL用于测试 */}
      <section className="test-urls">
        <h2>测试URL列表</h2>
        <ul>
          <li>https://via.placeholder.com/100.png</li>
          <li>https://via.placeholder.com/200x100.png</li>
          <li>https://www.kasandbox.org/programming-images/avatars/purple-pi.png</li>
          <li>https://www.kasandbox.org/programming-images/creatures/Hopper-Happy.png</li>
          <li>https://www.learningcontainer.com/wp-content/uploads/2020/08/Large-Sample-png-Image-download-for-Testing.png</li>
        </ul>
      </section>

      {/* 图片数组映射 */}
      <section className="image-array">
        <h2>图片数组</h2>
        {[
          "https://via.placeholder.com/150.png",
          "https://via.placeholder.com/250.png",
          "https://via.placeholder.com/350.png"
        ].map((url, index) => (
          <img key={index} src={url} alt={`Image ${index + 1}`} />
        ))}
      </section>
    </div>
  );
};

// 导出组件
export default ImageGallery;

// 常量配置
export const IMAGE_CONFIGS = {
  DEFAULT_AVATAR: "https://www.kasandbox.org/programming-images/avatars/leaf-blue.png",
  PLACEHOLDER: "https://via.placeholder.com/300.png",
  FALLBACK: "https://via.placeholder.com/150.png",
};

// 工具函数
export const getImageUrl = (filename: string): string => {
  return `./images/${filename}.png`;
};

// 类型定义中的默认值
export const DEFAULT_IMAGE: ImageItem = {
  id: 0,
  url: "https://via.placeholder.com/200.png",
  title: "Default",
  description: "Default placeholder image"
};
