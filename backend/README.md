# 情感分析应用 - 后端服务

这是情感分析应用的后端服务部分，基于Flask框架开发，提供语音识别和情感分析功能的API接口。本项目已优化以便于部署到Google App Engine。

## 技术栈

- **Flask**: Web框架
- **Flask-CORS**: 处理跨域请求
- **Transformers**: Hugging Face的自然语言处理库
- **TensorFlow**: 深度学习框架
- **Whisper**: OpenAI的语音识别模型
- **FER**: 面部表情识别库
- **OpenCV**: 计算机视觉库，用于视频处理

## 模型

本应用使用Hugging Face的预训练模型 `nlptown/bert-base-multilingual-uncased-sentiment` 进行情感分析，该模型支持多语言输入，可以将文本分类为1-5星（对应非常消极到非常积极）的情感评分。

## API接口

### 1. 状态检查

- **端点**: `/api/status`
- **方法**: GET
- **描述**: 检查模型是否已加载完成
- **返回示例**:

  ```json
  {
    "model_loaded": true
  }
  ```

### 2. 文本分析

- **端点**: `/api/analyze`
- **方法**: POST
- **描述**: 分析文本的情感
- **请求体**:

  ```json
  {
    "text": "这是一段要分析的文本",
    "language": "zh-CN"  // 可选，默认为中文
  }
  ```

- **返回示例**:

  ```json
  {
    "success": true,
    "result": "积极",
    "scores": [0.01, 0.05, 0.14, 0.65, 0.15],
    "predicted_class": 3
  }
  ```

### 3. 音频文件上传

- **端点**: `/api/upload`
- **方法**: POST
- **描述**: 上传音频文件进行语音识别和情感分析
- **请求体**: 表单数据，包含音频文件和语言参数
- **返回示例**:
  ```json
  {
    "success": true,
    "text": "识别出的文本",
    "emotion": {
      "success": true,
      "result": "积极",
      "scores": [0.01, 0.05, 0.14, 0.65, 0.15],
      "predicted_class": 3
    }
  }
  ```

### 4. 实时录音处理

- **端点**: `/api/record`
- **方法**: POST
- **描述**: 处理前端发送的Base64编码的音频数据
- **请求体**:
  ```json
  {
    "audio": "BASE64_ENCODED_AUDIO_DATA",
    "language": "zh-CN"  // 可选，默认为中文
  }
  ```
- **返回示例**:
  ```json
  {
    "success": true,
    "text": "识别出的文本",
    "emotion": {
      "success": true,
      "result": "积极",
      "scores": [0.01, 0.05, 0.14, 0.65, 0.15],
      "predicted_class": 3
    }
  }
  ```

## 安装与运行

1. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

2. 运行服务
   ```bash
   python app.py
   ```
   服务将在 http://localhost:5001 运行

## 注意事项

- 首次启动时，模型会在后台线程中加载，可能需要一些时间
- 语音识别功能需要网络连接，因为它使用Google的语音识别服务
- 支持的音频文件格式：WAV, MP3, FLAC
- 上传的音频文件大小限制为16MB

## 开发与扩展

如需扩展功能，可以考虑：

1. 添加更多语言支持
2. 集成其他情感分析模型
3. 添加本地语音识别引擎，减少对网络的依赖
4. 实现情感分析结果的持久化存储
5. 添加用户认证功能
