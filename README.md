# 情感分析应用

这是一个基于Web的情感分析应用，可以通过文本、语音、视频和摄像头进行多语言情感分析。

## 项目概述

本项目是一个全面的情感分析系统，使用了以下技术：

- **后端**：Flask API服务
- **前端**：React + Material UI + Chart.js
- **模型**：
  - 文本情感分析：Hugging Face的"nlptown/bert-base-multilingual-uncased-sentiment"模型
  - 语音识别：OpenAI的Whisper模型
  - 面部表情识别：FER库

## 主要功能

1. **文本情感分析**
   - 直接输入文本进行情感分析

2. **语音情感分析**
   - 实时录音功能
   - 音频文件上传功能
   - 语音转文本并分析情感

3. **视频情感分析**
   - 视频文件上传分析
   - 分析视频中的面部表情和语音

4. **实时摄像头情感分析**
   - 分析实时摄像头捕捉的面部表情

5. **多语言支持**
   - 支持中文和英文
   - 支持简繁中文转换

6. **情感可视化**
   - 使用Chart.js展示分析结果

## 技术实现

- 使用Flask提供Web API
- 使用MediaRecorder API实现浏览器录音
- 使用Whisper进行语音识别
- 使用Transformers进行文本情感分析
- 使用FER和OpenCV进行面部表情识别
- 使用Material UI实现现代化响应式UI

## 项目结构

```
emotion/
├── backend/                # 后端Flask应用
│   ├── app.py              # 主应用文件
│   ├── modules/            # 功能模块
│   │   ├── models.py       # 模型管理
│   │   ├── text_analysis.py # 文本分析
│   │   ├── speech_recognition.py # 语音识别
│   │   ├── video_analysis.py # 视频分析
│   │   ├── camera_analysis.py # 摄像头分析
│   │   └── utils.py        # 工具函数
│   ├── Dockerfile          # Docker配置
│   └── requirements.txt    # 后端依赖
├── frontend-mui/           # 前端React+Material UI应用
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── components/     # 组件
│   │   ├── App.js          # 主组件
│   │   └── ...
│   ├── package.json        # 前端依赖
│   └── ...
├── start.sh                # 启动脚本
└── stop.sh                 # 停止脚本
```

## 安装与运行

### 使用启动脚本（推荐）

直接运行根目录下的启动脚本：

```bash
bash start.sh
```

此脚本会自动启动后端和前端服务。

### 手动启动

#### 后端

1. 进入后端目录
   ```bash
   cd backend
   ```

2. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

3. 运行后端服务
   ```bash
   python app.py
   ```
   服务将在 [http://localhost:5001](http://localhost:5001) 运行

#### 前端

1. 进入前端目录
   ```bash
   cd frontend-mui
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 运行前端应用
   ```bash
   npm start
   ```
   应用将在 [http://localhost:3001](http://localhost:3001) 运行

### Docker部署（后端）

后端支持Docker部署：

```bash
cd backend
docker build -t emotion-analysis-backend .
docker run -p 8080:8080 emotion-analysis-backend
```

## 使用说明

1. 启动后端和前端服务
2. 打开浏览器访问 [http://localhost:3001](http://localhost:3001)
3. 选择分析模式：
   - 文本分析：直接输入文本
   - 语音分析：上传音频文件或使用麦克风录音
   - 视频分析：上传视频文件
   - 摄像头分析：允许使用摄像头
4. 查看分析结果和可视化图表

## 注意事项

- 使用语音功能需要授予浏览器麦克风访问权限
- 使用摄像头功能需要授予浏览器摄像头访问权限
- 模型首次加载可能需要一些时间，请耐心等待
- 支持的音频文件格式：WAV, MP3, FLAC
- 支持的视频文件格式：MP4, AVI, MOV
- 上传的文件大小限制为16MB

## 停止服务

使用根目录下的停止脚本：

```bash
bash stop.sh
```
