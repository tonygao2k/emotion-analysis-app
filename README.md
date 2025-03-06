# 情感分析应用

这是一个基于Web的情感分析应用，可以通过语音输入或文本输入进行多语言情感分析。

## 项目概述

本项目是从原来的PyQt5桌面应用转换为Web应用的情感分析系统，使用了以下技术：

- **后端**：Flask API服务
- **前端**：React + Bootstrap 5 + Chart.js
- **模型**：Hugging Face的"nlptown/bert-base-multilingual-uncased-sentiment"模型

## 主要功能

1. **语音输入分析**
   - 实时录音功能
   - 音频文件上传功能

2. **文本输入分析**
   - 直接输入文本进行情感分析

3. **多语言支持**
   - 支持中文和英文

4. **情感可视化**
   - 使用Chart.js展示分析结果

## 技术实现

- 使用Flask提供Web API
- 使用MediaRecorder API实现浏览器录音
- 使用SpeechRecognition进行语音识别
- 使用Transformers进行情感分析
- 使用Bootstrap实现响应式UI

## 项目结构

```
emotion/
├── backend/                # 后端Flask应用
│   ├── app.py              # 主应用文件
│   └── requirements.txt    # 后端依赖
└── frontend/               # 前端React应用
    ├── public/             # 静态资源
    ├── src/                # 源代码
    │   ├── App.js          # 主组件
    │   └── ...
    ├── package.json        # 前端依赖
    └── ...
```

## 安装与运行

### 后端

1. 进入后端目录
   ```
   cd backend
   ```

2. 安装依赖
   ```
   pip install -r requirements.txt
   ```

3. 运行后端服务
   ```
   python app.py
   ```
   服务将在 http://localhost:5001 运行

### 前端

1. 进入前端目录
   ```
   cd frontend
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 运行前端应用
   ```
   npm start
   ```
   应用将在 http://localhost:3000 运行

## 使用说明

1. 启动后端和前端服务
2. 打开浏览器访问 http://localhost:3000
3. 选择语音输入或文本输入模式
4. 进行情感分析并查看结果

## 注意事项

- 使用语音功能需要授予浏览器麦克风访问权限
- 模型首次加载可能需要一些时间，请耐心等待
