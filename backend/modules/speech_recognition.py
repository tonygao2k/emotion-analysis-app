#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
语音识别模块
负责音频文件的处理和语音识别功能
"""

import os
import base64
import tempfile
import logging
from flask import request, jsonify
import time
from werkzeug.utils import secure_filename

# 导入自定义模块
from modules.models import whisper_model, model_loaded
from modules.utils import (
    error_response,
    allowed_file,
    safe_filename,
    traditional_to_simplified,
)
from modules.text_analysis import analyze_emotion

# 配置日志
logger = logging.getLogger(__name__)


def recognize_speech(audio_file, language="zh-CN"):
    """使用Whisper识别语音"""
    # 初始化Whisper模型（如果尚未初始化）
    global whisper_model
    if whisper_model is None:
        try:
            import whisper

            logger.info("尝试初始化Whisper模型...")
            whisper_model = whisper.load_model("base")
            logger.info("Whisper模型初始化成功")
        except Exception as e:
            logger.error(f"初始化Whisper模型失败: {str(e)}")
            return None, f"语音识别模型初始化失败: {str(e)}"

    # 如果模型仍然为None，返回模拟数据
    if whisper_model is None:
        return (
            "这是一段模拟的语音识别结果。由于模型尚未加载完成，我们提供了这个示例文本。请稍后再试。",
            None,
        )

    try:
        start_time = time.time()
        logger.info(f"开始识别语音，语言: {language}")

        # 使用Whisper模型进行语音识别
        result = whisper_model.transcribe(
            audio_file, language=language[:2] if language else None, fp16=False
        )

        # 获取识别结果
        text = result["text"].strip()

        # 将繁体中文转换为简体中文
        text = traditional_to_simplified(text)
        end_time = time.time()
        logger.info(f"语音识别完成，耗时: {end_time - start_time:.2f}秒")
        logger.info(f"识别结果: {text[:100]}...")
        return text, None
    except Exception as e:
        error_msg = f"语音识别出错: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


def process_audio_file(file_path, language="zh-CN"):
    """处理音频文件并返回识别结果及情感分析"""
    try:
        # 识别语音
        text, error = recognize_speech(file_path, language)
        if error:
            return error_response(error)

        # 对识别出的文本进行情感分析
        emotion_result, emotion_error = analyze_emotion(text)
        if emotion_error:
            logger.warning(f"情感分析出错: {emotion_error}")
            # 即使情感分析出错，仍然返回语音识别结果
            return jsonify(
                {
                    "success": True,
                    "text": text,
                    "language": language,
                    "emotion_analysis": None,
                    "emotion_error": emotion_error,
                }
            )

        return jsonify(
            {
                "success": True,
                "text": text,
                "language": language,
                "emotion_analysis": emotion_result,
            }
        )
    except Exception as e:
        return error_response(f"处理音频文件时出错: {str(e)}")


def process_audio_base64(audio_data, language="zh-CN"):
    """处理Base64编码的音频数据"""
    try:
        # 解码Base64数据
        audio_bytes = base64.b64decode(audio_data)

        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name

        try:
            # 识别语音
            text, error = recognize_speech(temp_file_path, language)
            if error:
                return error_response(error)

            # 对识别出的文本进行情感分析
            emotion_result, emotion_error = analyze_emotion(text)
            if emotion_error:
                logger.warning(f"情感分析出错: {emotion_error}")

                # 即使情感分析出错，仍然返回语音识别结果
                return jsonify(
                    {
                        "success": True,
                        "text": text,
                        "language": language,
                        "emotion_analysis": None,
                        "emotion_error": emotion_error,
                    }
                )

            return jsonify(
                {
                    "success": True,
                    "text": text,
                    "language": language,
                    "emotion_analysis": emotion_result,
                }
            )
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    except Exception as e:
        return error_response(f"处理音频数据时出错: {str(e)}")


def handle_upload_request(upload_folder):
    """处理音频上传请求"""
    try:
        # 检查是否有文件
        if "file" not in request.files:
            return error_response("未找到文件")

        file = request.files["file"]

        # 检查文件名
        if file.filename == "":
            return error_response("未选择文件")

        # 全面验证文件
        from modules.utils import validate_audio_file

        valid, error_msg = validate_audio_file(file)
        if not valid:
            logger.warning(f"文件验证失败: {error_msg}, 文件名: {file.filename}")
            return error_response(error_msg)

        # 获取语言参数
        language = request.form.get("language", "zh-CN")

        # 生成安全的文件名并保存文件
        filename = safe_filename(file.filename)
        file_path = os.path.join(upload_folder, filename)

        # 记录文件信息
        from modules.utils import get_file_hash

        file_hash = get_file_hash(file)
        logger.info(f"处理上传文件: {filename}, 哈希值: {file_hash}")

        # 保存文件
        file.save(file_path)

        try:
            # 处理音频文件
            return process_audio_file(file_path, language)
        finally:
            # 清理文件
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception as e:
        logger.error(f"处理音频上传时发生错误: {str(e)}")
        # 对外部返回通用错误信息
        return error_response("处理文件时发生错误")


def handle_record_request():
    """处理录音数据请求"""
    # 检查请求数据
    if not request.is_json:
        return error_response("请求必须包含JSON数据")

    data = request.get_json()

    # 检查必要字段
    if "audio" not in data:
        return error_response("缺少音频数据")

    # 获取参数
    audio_data = data["audio"]
    language = data.get("language", "zh-CN")

    # 处理Base64编码的音频数据
    return process_audio_base64(audio_data, language)
