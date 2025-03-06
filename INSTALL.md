# 情感分析应用安装指南

本文档提供详细的安装步骤和常见问题解决方案。

## 系统要求

- Python 3.8+
- Node.js 14+
- npm 6+
- 麦克风（用于语音输入功能）

## 安装步骤

### 1. 克隆或下载项目

确保您已经获取了完整的项目代码。

### 2. 安装后端依赖

#### 自动安装（推荐）

使用提供的启动脚本会自动创建虚拟环境并安装所有依赖：

```bash
./start.sh
```

#### 手动安装

如果您想手动安装：

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

## 启动应用

### 使用脚本启动（推荐）

```bash
./start.sh
```

这将同时启动后端和前端服务。

### 手动启动

后端：
```bash
cd backend
source venv/bin/activate
python app.py
```

前端：
```bash
cd frontend
npm start
```

## 访问应用

启动成功后，在浏览器中访问：
- 前端界面：http://localhost:3000
- 后端API：http://localhost:5001

## 常见问题解决

### 1. PyTorch 安装问题

如果遇到 PyTorch 安装错误，可能是因为版本不兼容。尝试：

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

或访问 [PyTorch 官网](https://pytorch.org/get-started/locally/) 获取适合您系统的安装命令。

### 2. PyAudio 安装问题

在某些系统上，PyAudio 可能需要额外的依赖：

#### macOS:
```bash
brew install portaudio
pip install PyAudio
```

#### Linux:
```bash
sudo apt-get install python3-pyaudio
```

### 3. 模型加载缓慢

首次启动时，模型需要从 Hugging Face 下载，这可能需要一些时间，请耐心等待。

### 4. 语音识别不工作

确保：
- 已授予浏览器麦克风访问权限
- 有稳定的网络连接（语音识别使用Google API）
- 麦克风工作正常

### 5. 跨域请求问题

如果遇到跨域问题，确保后端和前端都正确启动，且端口分别为5001和3000。

## 停止应用

使用提供的停止脚本：

```bash
./stop.sh
```

或按 Ctrl+C 停止启动脚本。
