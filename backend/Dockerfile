FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建上传文件夹
RUN mkdir -p uploads

# 设置环境变量
ENV PORT=8080
ENV FLASK_ENV=production
ENV MODEL_NAME=nlptown/bert-base-multilingual-uncased-sentiment
ENV UPLOAD_FOLDER=uploads
ENV MAX_CONTENT_LENGTH=16777216

# 启动命令
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 300 app:app
