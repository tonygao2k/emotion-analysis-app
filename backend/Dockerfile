FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装依赖，使用--no-cache-dir减小镜像大小
RUN pip install --no-cache-dir -r requirements.txt && \
    # 清理pip缓存
    pip cache purge && \
    # 创建非root用户
    adduser --disabled-password --gecos "" appuser && \
    # 创建并设置上传文件夹权限
    mkdir -p /app/uploads && \
    chown -R appuser:appuser /app

# 复制应用代码
COPY --chown=appuser:appuser . .

# 设置环境变量
ENV PORT=8080 \
    FLASK_ENV=production \
    MODEL_NAME=nlptown/bert-base-multilingual-uncased-sentiment \
    UPLOAD_FOLDER=/app/uploads \
    MAX_CONTENT_LENGTH=16777216 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 切换到非root用户
USER appuser

# 设置健康检查
HEALTHCHECK CMD curl --fail http://localhost:$PORT/health || exit 1

# 启动命令
CMD exec gunicorn --bind :$PORT \
    --workers 1 \
    --threads 8 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app:app
