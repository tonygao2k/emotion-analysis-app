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
import threading  # 引入线程模块
import uuid  # 引入UUID生成唯一任务ID

# 导入自定义模块
from modules.models import (
    load_model,
    get_model_status,
    model_loaded,
    model,
    tokenizer,
    whisper_model,
    emotion_detector,
)
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

# 用于存储异步任务状态和结果的字典
# 结构: { 'task_id': {'status': 'processing'/'completed'/'failed', 'result': ..., 'error': ...} }
task_status = {}

# 确保线程安全访问 task_status 的锁
task_lock = threading.Lock()

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
    max_age=600,  # 预检请求的缓存时间，减少OPTIONS请求
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
    """获取详细的模型加载状态和系统信息"""
    try:
        model_status = get_model_status()

        # 添加详细的模型状态信息
        detailed_status = {
            "overall_status": (
                "ready"
                if model_status["loaded"]
                else ("loading" if model_status["loading"] else "failed")
            ),
            "models": {
                "text_analysis": {
                    "loaded": model is not None and tokenizer is not None,
                    "name": model_status.get("model_name", "N/A"),
                },
                "speech_recognition": {
                    "loaded": whisper_model is not None,
                    "name": "OpenAI Whisper base",
                },
                "face_emotion": {
                    "loaded": emotion_detector is not None,
                    "name": "FER with MTCNN",
                },
            },
            "system": {
                "device": model_status["device"],
                "cuda_available": model_status["cuda_available"],
                "last_load_time": model_status["last_load_time"],
                "loading": model_status["loading"],
            },
            "capabilities": {
                "text_emotion": model is not None and tokenizer is not None,
                "speech_to_text": whisper_model is not None,
                "face_emotion": emotion_detector is not None,
                "video_analysis": (
                    emotion_detector is not None and whisper_model is not None
                ),
                "camera_analysis": emotion_detector is not None,
            },
        }

        return jsonify(
            {
                "success": True,
                "status": detailed_status,
                "legacy_status": model_status,  # 保持向后兼容
            }
        )
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


# --- 异步任务处理函数 ---
def run_video_analysis_async(task_id, file_path, language):
    """在后台线程中运行视频分析并更新状态"""
    global task_status
    try:
        logger.info(f"[Task {task_id}] 开始异步视频分析: {file_path}")
        # 直接调用处理逻辑，避免Flask Response对象的复杂性
        from modules.video_analysis import process_video

        result, error = process_video(file_path, language)
        logger.info(f"[Task {task_id}] 异步视频分析完成")

        # 更新任务状态为完成
        with task_lock:
            if error:
                task_status[task_id] = {
                    "status": "failed",
                    "result": None,
                    "error": error,
                }
            else:
                task_status[task_id] = {
                    "status": "completed",
                    "result": {"success": True, "result": result},
                    "error": None,
                }
    except Exception as e:
        logger.error(f"[Task {task_id}] 异步视频分析出错: {str(e)}", exc_info=True)
        # 更新任务状态为失败
        with task_lock:
            task_status[task_id] = {"status": "failed", "result": None, "error": str(e)}
    finally:
        # 清理上传的临时文件
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"[Task {task_id}] 已清理临时文件: {file_path}")
        except Exception as e:
            logger.error(f"[Task {task_id}] 清理临时文件时出错: {str(e)}")


# 视频上传处理API (修改为异步)
@app.route("/api/upload_video", methods=["POST"])
def api_upload_video():
    """处理视频上传请求（异步）"""
    global task_status
    try:
        # 检查是否有文件
        if "file" not in request.files:
            return error_response("未找到文件")

        file = request.files["file"]

        # 检查文件名
        if file.filename == "":
            return error_response("未选择文件")

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

        # 创建任务ID
        task_id = str(uuid.uuid4())

        # 初始化任务状态为 processing
        with task_lock:
            task_status[task_id] = {
                "status": "processing",
                "result": None,
                "error": None,
            }

        # 创建并启动后台线程
        thread = threading.Thread(
            target=run_video_analysis_async, args=(task_id, file_path, language)
        )
        thread.daemon = True  # 设置为守护线程，主程序退出时线程也退出
        thread.start()
        logger.info(f"已为视频分析启动后台任务，Task ID: {task_id}")

        # 立即返回任务ID给客户端
        return jsonify(
            {"success": True, "message": "视频处理已开始", "task_id": task_id}
        )

    except Exception as e:
        logger.error(f"处理视频上传请求时发生错误: {str(e)}", exc_info=True)
        return error_response("处理视频上传请求时发生内部错误")


# 新增：获取异步任务状态的API
@app.route("/api/task_status/<task_id>", methods=["GET"])
def get_task_status(task_id):
    """获取指定异步任务的状态和结果"""
    global task_status
    with task_lock:
        status_info = task_status.get(task_id)

    if status_info:
        response = {
            "success": True,
            "task_id": task_id,
            "status": status_info["status"],
        }
        if status_info["status"] == "completed":
            response["result"] = status_info["result"]
        elif status_info["status"] == "failed":
            response["error"] = status_info["error"]
            # 可选：如果任务失败或完成，可以从字典中移除以节省内存
            # if status_info["status"] in ["completed", "failed"]:
            #     del task_status[task_id]
        return jsonify(response)
    else:
        return error_response(f"未找到任务ID: {task_id}", 404)


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
    try:
        from modules.monitoring import get_health_status

        health_data = get_health_status()

        return jsonify(
            {
                "status": "ok" if health_data["healthy"] else "warning",
                "model_loaded": model_loaded,
                "timestamp": time.time(),
                "version": "1.0.0",
                "health": health_data,
            }
        )
    except Exception as e:
        logger.error(f"健康检查时出错: {str(e)}")
        return jsonify(
            {
                "status": "error",
                "model_loaded": model_loaded,
                "timestamp": time.time(),
                "version": "1.0.0",
                "error": "健康检查失败",
            }
        )


# 用于前端连接测试的端点
@app.route("/api/ping", methods=["GET"])
def ping():
    """简单的连接测试端点"""
    return jsonify({"status": "ok", "message": "pong", "timestamp": time.time()})


# 性能监控端点
@app.route("/api/performance", methods=["GET"])
def performance_stats():
    """获取性能统计信息"""
    try:
        from modules.monitoring import get_performance_summary

        stats = get_performance_summary()
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        logger.error(f"获取性能统计时出错: {str(e)}")
        return error_response("获取性能统计失败")


if __name__ == "__main__":
    # 在主线程中加载模型
    logger.info("正在加载AI模型...")
    try:
        # 尝试加载模型
        load_model()
        if model_loaded:
            logger.info("所有模型加载成功")
        else:
            logger.error("模型加载失败，应用将以降级模式启动")
            logger.warning("部分功能可能不可用，请检查模型依赖和网络连接")
    except Exception as e:
        logger.error(f"模型加载过程中发生错误: {str(e)}", exc_info=True)
        logger.warning("应用将以降级模式启动，部分AI功能将不可用")

    logger.info(f"当前模型加载状态: {model_loaded}")

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
