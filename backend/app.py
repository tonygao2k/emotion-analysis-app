#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
情感分析应用后端
主应用文件，包含Flask应用初始化和路由定义
"""

import os
import tempfile
import logging
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

# 导入自定义模块
from modules.models import load_model, get_model_status, model_loaded
from modules.utils import (
    error_response,
    allowed_file,
    allowed_video_file,
    ensure_upload_folder,
)
from modules.speech_recognition import handle_upload_request, handle_record_request
from modules.text_analysis import handle_text_analysis_request
from modules.video_analysis import handle_video_upload_request
from modules.camera_analysis import handle_camera_frame_request

# 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 添加文件处理器，将日志输出到文件
file_handler = logging.FileHandler("backend.log", mode="w", encoding="utf-8")
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# 创建Flask应用
app = Flask(__name__)

# 增强的CORS配置，只允许特定域名访问并限制方法和头部
CORS(
    app,
    origins=[
        "https://emotion-analysis.web.app",  # Firebase域名
        "https://emotion-analysis.firebaseapp.com",  # Firebase域名
        "http://localhost:3000",  # 本地开发环境
        "http://localhost:3001",  # 备用本地端口
        "http://127.0.0.1:3000",  # 使用IP地址的本地开发环境
        "http://127.0.0.1:3001",  # 使用IP地址的备用本地端口
    ],
    methods=["GET", "POST", "OPTIONS"],  # 限制允许的HTTP方法
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],  # 允许的头部
    expose_headers=["Content-Length", "X-Request-ID"],  # 暴露给前端的头部
    supports_credentials=True,  # 支持跨域请求中的凭证
    max_age=600  # 预检请求的缓存时间，减少OPTIONS请求
)

# 从环境变量获取配置
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", tempfile.gettempdir())
app.config["UPLOAD_FOLDER"] = ensure_upload_folder(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = int(
    os.environ.get("MAX_CONTENT_LENGTH", 32 * 1024 * 1024)
)  # 限制上传文件大小为32MB


# API路由定义


# 获取模型状态API
@app.route("/api/status", methods=["GET"])
def status():
    """获取模型加载状态和系统信息"""
    try:
        model_status = get_model_status()
        return jsonify({"success": True, "status": model_status})
    except Exception as e:
        return error_response(f"获取状态时出错: {str(e)}")


# 文本情感分析API
@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """分析文本API"""
    if not request.is_json:
        return error_response("请求必须包含JSON数据")

    data = request.get_json()
    text = data.get("text", "")

    return handle_text_analysis_request(text)


# 音频文件上传API
@app.route("/api/upload", methods=["POST"])
def api_upload():
    """上传音频文件API"""
    return handle_upload_request(app.config["UPLOAD_FOLDER"])


# 录音数据处理API
@app.route("/api/record", methods=["POST"])
def api_record():
    """处理录音数据API"""
    return handle_record_request()


# 视频上传处理API
@app.route("/api/upload_video", methods=["POST"])
def api_upload_video():
    """处理视频上传请求"""
    try:
        # 检查是否有文件
        if "file" not in request.files:
            return error_response("未找到文件")

        file = request.files["file"]

        # 检查文件名
        if file.filename == "":
            return error_response("未选择文件")

        # 全面验证文件
        from modules.utils import validate_video_file, get_file_hash, safe_filename
        valid, error_msg = validate_video_file(file)
        if not valid:
            logger.warning(f"视频文件验证失败: {error_msg}, 文件名: {file.filename}")
            return error_response(error_msg)

        # 获取语言参数
        language = request.form.get("language", "zh-CN")

        # 生成安全的文件名
        safe_name = safe_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_name)
        
        # 记录文件信息
        file_hash = get_file_hash(file)
        logger.info(f"处理视频上传: {safe_name}, 哈希值: {file_hash[:10]}...")
        
        # 保存文件
        file.save(file_path)

        try:
            # 处理视频文件
            return handle_video_upload_request(file_path, language)
        finally:
            # 清理文件
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception as e:
        logger.error(f"处理视频上传时发生错误: {str(e)}")
        # 对外部返回通用错误信息
        return error_response("处理视频文件时发生错误")


# 摄像头帧分析API
@app.route("/api/analyze_frame", methods=["POST"])
def api_analyze_frame():
    """处理摄像头帧分析请求"""
    if not request.is_json:
        return error_response("请求必须包含JSON数据")

    data = request.get_json()

    # 检查必要字段
    if "image" not in data:
        return error_response("缺少图像数据")

    # 获取图像数据
    image_data = data["image"]

    # 处理图像数据
    return handle_camera_frame_request(image_data)


# 请求日志中间件
@app.before_request
def log_request_info():
    """记录每个请求的信息"""
    logger.info(
        f"请求: {request.method} {request.path} - 参数: {dict(request.args)} - IP: {request.remote_addr}"
    )


# 健康检查端点
@app.route("/health", methods=["GET"])
def health_check():
    """健康检查端点，用于监控"""
    return jsonify(
        {
            "status": "ok",
            "model_loaded": model_loaded,
            "timestamp": time.time(),
            "version": "1.0.0",
        }
    )


# 用于前端连接测试的端点
@app.route("/api/ping", methods=["GET"])
def ping():
    """简单的连接测试端点"""
    return jsonify({"status": "ok", "message": "pong", "timestamp": time.time()})


if __name__ == "__main__":
    # 直接在主线程中加载模型，确保启动前完成加载
    logger.info("在主线程中加载模型...")
    try:
        # 尝试正常加载模型
        load_model()
    except Exception as e:
        logger.error(f"模型加载失败: {str(e)}")
        logger.warning("强制设置模型为已加载状态，以便摄像头功能可以正常工作")
        # 强制设置模型为已加载状态
        load_model(force_success=True)
    
    logger.info(f"模型加载状态: {model_loaded}")

    # 从环境变量获取端口或使用默认值
    port = int(os.environ.get("PORT", 8080))
    
    # 判断环境
    env = os.environ.get("FLASK_ENV", "development")
    debug = env == "development"
    
    if env == "production":
        # 生产环境下提示使用WSGI服务器
        logger.info("生产环境应使用gunicorn或uwsgi等WSGI服务器启动应用")
        logger.info(f"示例: gunicorn --bind :{port} --workers 1 --threads 8 app:app")
    else:
        # 开发环境使用Flask内置服务器
        logger.info(f"启动开发服务器，端口: {port}, 调试模式: {debug}")
        app.run(host="0.0.0.0", debug=debug, port=port)
