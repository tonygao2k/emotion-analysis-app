#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
摄像头分析模块
负责处理实时摄像头图像的情感分析功能
"""

import cv2
import base64
import logging
import time
import numpy as np
from flask import jsonify
import io
from PIL import Image

# 导入自定义模块
from modules.models import emotion_detector, model_loaded
from modules.utils import error_response, emotion_to_chinese

# 配置日志
logger = logging.getLogger(__name__)


def process_camera_frame(image_data):
    """处理摄像头帧并进行情感分析"""
    # 初始化FER模型（如果尚未初始化）
    global emotion_detector
    if emotion_detector is None:
        try:
            from fer import FER
            logger.info("尝试初始化FER模型...")
            emotion_detector = FER(mtcnn=True)
            logger.info("FER模型初始化成功")
        except Exception as e:
            logger.error(f"初始化FER模型失败: {str(e)}")
            # 如果初始化失败，返回模拟数据
            return _get_mock_emotion_data(), None

    try:
        start_time = time.time()
        
        # 预处理图像
        preprocessing_start = time.time()
        
        # 从Base64解码图像
        try:
            # 检查并移除可能的Base64前缀
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            logger.error(f"Base64解码失败: {str(e)}")
            return None, f"图像数据格式错误: {str(e)}"
        
        # 转换为OpenCV格式
        img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        preprocessing_end = time.time()
        preprocessing_duration = preprocessing_end - preprocessing_start
        
        # 尝试使用FER模型进行情绪分析
        # 如果emotion_detector仍然为None，再次尝试初始化
        if emotion_detector is None:
            try:
                from fer import FER
                logger.info("尝试初始化FER模型...")
                emotion_detector = FER(mtcnn=True)
                logger.info("FER模型初始化成功")
            except Exception as e:
                logger.error(f"初始化FER模型失败: {str(e)}")
                # 如果初始化失败，返回模拟数据
                total_duration = time.time() - start_time
                mock_result = _get_mock_emotion_data()
                mock_result["processing_info"]["total_time"] = round(total_duration * 1000, 2)
                mock_result["processing_info"]["preprocessing_time"] = round(preprocessing_duration * 1000, 2)
                return mock_result, None
        
        # 使用FER进行情绪分析
        detection_start = time.time()
        emotions = emotion_detector.detect_emotions(img)
        detection_end = time.time()
        detection_duration = detection_end - detection_start
        
        # 检查是否检测到人脸
        if not emotions or len(emotions) == 0:
            error_msg = "未检测到人脸"
            logger.warning(error_msg)
            
            # 计算总处理时间
            total_duration = time.time() - start_time
            
            return None, {
                "error": error_msg,
                "processing_info": {
                    "total_time": round(total_duration * 1000, 2),
                    "preprocessing_time": round(preprocessing_duration * 1000, 2),
                    "detection_time": round(detection_duration * 1000, 2),
                }
            }
        
        # 获取第一个检测到的人脸的情绪
        emotion_data = emotions[0]["emotions"]
        dominant_emotion = max(emotion_data, key=emotion_data.get)
        
        # 获取人脸位置
        face_location = emotions[0]["box"]  # 获取人脸框位置 [x, y, w, h]
        
        # 计算总处理时间
        total_duration = time.time() - start_time
        
        result = {
            "success": True,
            "emotions": emotion_data,
            "dominant_emotion": dominant_emotion,
            "dominant_emotion_zh": emotion_to_chinese(dominant_emotion),
            "face_location": face_location,
            "processing_info": {
                "total_time": round(total_duration * 1000, 2),
                "preprocessing_time": round(preprocessing_duration * 1000, 2),
                "detection_time": round(detection_duration * 1000, 2),
            }
        }
        
        return result, None
    except Exception as e:
        error_msg = f"处理摄像头帧时出错: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


def _get_mock_emotion_data():
    """返回模拟的情绪数据"""
    # 创建模拟的情绪数据，每次调用时稍微变化一下数据
    import random
    
    # 基础情绪数据
    emotions = {
        "angry": random.uniform(0.01, 0.1),
        "disgust": random.uniform(0.01, 0.05),
        "fear": random.uniform(0.01, 0.05),
        "happy": random.uniform(0.5, 0.9),  # 主要情绪仍然是快乐
        "sad": random.uniform(0.01, 0.1),
        "surprise": random.uniform(0.01, 0.1),
        "neutral": random.uniform(0.05, 0.2)
    }
    
    # 确保所有情绪概率之和为1
    total = sum(emotions.values())
    for emotion in emotions:
        emotions[emotion] = round(emotions[emotion] / total, 2)
    
    # 确定主要情绪
    dominant_emotion = max(emotions, key=emotions.get)
    
    # 模拟的人脸位置（稍微变化位置）
    face_x = random.randint(80, 120)
    face_y = random.randint(80, 120)
    face_w = random.randint(180, 220)
    face_h = random.randint(180, 220)
    face_location = [face_x, face_y, face_w, face_h]
    
    return {
        "success": True,
        "emotions": emotions,
        "dominant_emotion": dominant_emotion,
        "dominant_emotion_zh": emotion_to_chinese(dominant_emotion),
        "face_location": face_location,
        "processing_info": {
            "total_time": random.uniform(40, 60),  # 模拟的处理时间（毫秒）
            "preprocessing_time": random.uniform(5, 15),
            "detection_time": random.uniform(30, 50),
            "note": "模拟数据（FER模型未加载）",
        }
    }


def handle_camera_frame_request(image_data):
    """处理摄像头帧分析请求"""
    try:
        # 处理图像数据
        result, error = process_camera_frame(image_data)
        
        if isinstance(error, dict) and "error" in error:
            # 特殊情况：未检测到人脸
            return jsonify({
                "success": False,
                "error": error["error"],
                "processing_info": error.get("processing_info", {})
            }), 400
        elif error:
            # 其他错误
            return error_response(error)
        
        # 成功情况
        return jsonify(result)
    except Exception as e:
        return error_response(f"处理摄像头帧请求时出错: {str(e)}")
