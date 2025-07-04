#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
通用工具函数模块
包含各种辅助函数
"""

import os
import logging
from flask import jsonify, request
import re
import uuid
import time

# 导入OpenCC用于简繁转换
try:
    from opencc import OpenCC

    cc = OpenCC("t2s")  # 繁体转简体
    opencc_available = True
except ImportError:
    opencc_available = False
    logging.warning("OpenCC库未安装，简繁转换功能不可用")

# 配置日志
logger = logging.getLogger(__name__)

import magic  # 用于文件类型检测
import hashlib  # 用于生成文件哈希

# 允许的文件类型
ALLOWED_EXTENSIONS = {"wav", "mp3", "flac"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv"}

# 允许的MIME类型
ALLOWED_AUDIO_MIMES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/flac",
    "audio/x-flac",
}
ALLOWED_VIDEO_MIMES = {
    "video/mp4",
    "video/avi",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
}

# 文件大小限制
MAX_AUDIO_SIZE = 16 * 1024 * 1024  # 16MB
MAX_VIDEO_SIZE = 32 * 1024 * 1024  # 32MB


def generate_request_id():
    """生成唯一的请求ID"""
    return str(uuid.uuid4())[:8]


def log_request_start(endpoint, **kwargs):
    """记录请求开始的结构化日志"""
    request_id = generate_request_id()
    logger.info(
        f"[{request_id}] 请求开始: {endpoint}",
        extra={
            "request_id": request_id,
            "endpoint": endpoint,
            "method": getattr(request, "method", "N/A"),
            "user_agent": (
                getattr(request, "user_agent", {}).get("string", "N/A")
                if hasattr(request, "user_agent")
                else "N/A"
            ),
            "remote_addr": getattr(request, "remote_addr", "N/A"),
            "timestamp": time.time(),
            **kwargs,
        },
    )
    return request_id


def log_request_end(request_id, success=True, duration=None, **kwargs):
    """记录请求结束的结构化日志"""
    status = "成功" if success else "失败"
    log_msg = f"[{request_id}] 请求{status}"
    if duration:
        log_msg += f" (耗时: {duration:.2f}s)"

    log_level = logging.INFO if success else logging.ERROR
    logger.log(
        log_level,
        log_msg,
        extra={
            "request_id": request_id,
            "success": success,
            "duration": duration,
            "timestamp": time.time(),
            **kwargs,
        },
    )


def error_response(message, status_code=400, request_id=None):
    """统一的错误响应函数"""
    # 生成请求ID（如果没有提供的话）
    if not request_id:
        request_id = generate_request_id()

    # 根据状态码决定日志级别
    if status_code >= 500:
        log_level = logging.ERROR
        user_message = "服务器内部错误，请稍后再试"
    elif status_code >= 400:
        log_level = logging.WARNING
        user_message = message
    else:
        log_level = logging.INFO
        user_message = message

    logger.log(
        log_level,
        f"[{request_id}] 错误响应: {message}",
        extra={
            "request_id": request_id,
            "status_code": status_code,
            "error_message": message,
            "user_message": user_message,
            "timestamp": time.time(),
        },
    )

    return (
        jsonify({"success": False, "error": user_message, "request_id": request_id}),
        status_code,
    )


def check_file_size(file, max_size):
    """检查文件大小"""
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # 重置文件指针
    return file_size <= max_size


def get_file_mime(file):
    """获取文件的MIME类型"""
    # 保存当前位置
    current_position = file.tell()
    # 读取文件头部进行类型检测
    file_head = file.read(2048)
    file.seek(current_position)  # 重置文件指针
    mime = magic.Magic(mime=True).from_buffer(file_head)
    return mime


def get_file_hash(file):
    """计算文件的SHA-256哈希值"""
    # 保存当前位置
    current_position = file.tell()
    file.seek(0)
    # 计算文件哈希
    sha256_hash = hashlib.sha256()
    for byte_block in iter(lambda: file.read(4096), b""):
        sha256_hash.update(byte_block)
    file.seek(current_position)  # 重置文件指针
    return sha256_hash.hexdigest()


def allowed_file(filename):
    """检查音频文件名是否允许上传"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_video_file(filename):
    """检查视频文件名是否允许上传"""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS
    )


def validate_audio_file(file):
    """全面验证音频文件"""
    # 检查文件名
    if not allowed_file(file.filename):
        return False, "不支持的文件类型"

    # 检查文件大小
    if not check_file_size(file, MAX_AUDIO_SIZE):
        return False, "文件大小超过限制"

    # 检查MIME类型
    mime_type = get_file_mime(file)
    if mime_type not in ALLOWED_AUDIO_MIMES:
        return False, "文件内容类型不匹配"

    return True, ""


def validate_video_file(file):
    """全面验证视频文件"""
    logger.info(f"开始验证视频文件: {file.filename}")

    # 检查文件名
    if not allowed_video_file(file.filename):
        extension = (
            file.filename.rsplit(".", 1)[1].lower()
            if "." in file.filename
            else "无扩展名"
        )
        logger.warning(
            f"不支持的视频文件类型: {extension}, 允许的类型: {ALLOWED_VIDEO_EXTENSIONS}"
        )
        return False, "不支持的文件类型，请上传MP4、AVI、MOV或MKV格式的视频"

    # 检查文件大小
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # 重置文件指针

    if file_size > MAX_VIDEO_SIZE:
        logger.warning(
            f"视频文件大小超过限制: {file_size} 字节, 最大允许: {MAX_VIDEO_SIZE} 字节"
        )
        return False, f"文件大小超过限制，最大允许{MAX_VIDEO_SIZE/(1024*1024)}MB"

    # 检查MIME类型
    try:
        mime_type = get_file_mime(file)
        logger.info(f"检测到的MIME类型: {mime_type}")

        if mime_type not in ALLOWED_VIDEO_MIMES:
            logger.warning(
                f"不支持的MIME类型: {mime_type}, 允许的类型: {ALLOWED_VIDEO_MIMES}"
            )
            return False, "文件内容类型不匹配，请确保上传的是有效的视频文件"
    except Exception as e:
        logger.error(f"检查MIME类型时出错: {str(e)}")
        return False, "无法验证文件类型，请确保上传的是有效的视频文件"

    logger.info(
        f"视频文件验证通过: {file.filename}, 大小: {file_size} 字节, MIME类型: {mime_type}"
    )
    return True, ""


def emotion_to_chinese(emotion):
    """将英文情绪标签转换为中文"""
    emotion_map = {
        "angry": "愤怒",
        "disgust": "厌恶",
        "fear": "恐惧",
        "happy": "快乐",
        "sad": "悲伤",
        "surprise": "惊讶",
        "neutral": "中性",
    }
    return emotion_map.get(emotion.lower(), emotion)


def ensure_upload_folder(upload_folder):
    """确保上传文件夹存在"""
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    return upload_folder


def safe_filename(filename):
    """生成安全的文件名"""
    import uuid
    from werkzeug.utils import secure_filename

    # 先使用werkzeug的secure_filename处理
    safe_name = secure_filename(filename)
    # 添加UUID前缀确保唯一性
    prefix = str(uuid.uuid4())[:8]
    # 如果文件名为空，使用UUID作为文件名
    if not safe_name:
        return f"{prefix}"
    # 否则在原文件名前添加UUID前缀
    name, ext = os.path.splitext(safe_name)
    return f"{prefix}_{name}{ext}"


def traditional_to_simplified(text):
    """将繁体中文转换为简体中文"""
    if not text:
        return text

    if opencc_available:
        return cc.convert(text)
    else:
        # 如果OpenCC不可用，返回原文本
        return text
