#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
视频分析模块
负责视频文件的处理和情感分析功能
"""

import os
import cv2
import logging
import time
import numpy as np
from flask import jsonify
from moviepy.editor import VideoFileClip
import tempfile

# 导入自定义模块
from modules.models import emotion_detector, whisper_model, model_loaded
from modules.utils import error_response, emotion_to_chinese
from modules.speech_recognition import recognize_speech
from modules.text_analysis import analyze_emotion

# 配置日志
logger = logging.getLogger(__name__)


def process_video(video_file, language="zh-CN"):
    """处理视频文件，提取面部表情和音频"""
    # 即使模型未加载完成，也尝试处理视频
    # 记录模型加载状态，但不阻止处理
    if not model_loaded:
        logger.warning("模型尚未完全加载，将尝试继续处理视频")

    try:
        start_time = time.time()
        logger.info(f"开始处理视频文件: {video_file}")
        
        # 面部表情分析
        logger.info("开始分析视频中的面部表情...")
        
        # 初始化视频捕获
        video = cv2.VideoCapture(video_file)
        
        # 获取视频信息
        total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = video.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        logger.info(
            f"视频信息: 总帧数={total_frames}, FPS={fps}, 时长={duration:.2f}秒"
        )
        
        # 检查面部表情识别模型是否加载
        if emotion_detector is None:
            logger.warning("面部表情识别模型未加载，将跳过面部表情分析")
            face_emotions = []
            # 注意：即使跳过面部表情分析，我们仍然需要初始化video变量（已在上面完成）

        # 优化采样策略
        emotions = []
        max_samples = 20  # 最大采样数

        # 计算采样间隔
        if total_frames <= max_samples:
            # 视频很短，分析每一帧
            sample_indices = range(total_frames)
        else:
            # 均匀采样
            sample_indices = [
                int(i * total_frames / max_samples) for i in range(max_samples)
            ]

        logger.info(f"将采样 {len(sample_indices)} 帧进行分析")

        # 仅在模型加载时进行面部表情分析
        if emotion_detector is not None:
            for frame_idx in sample_indices:
                # 跳转到指定帧
                video.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = video.read()
                if not ret:
                    logger.warning(f"无法读取帧 {frame_idx}")
                    continue

                # 分析当前帧的表情
                try:
                    result = emotion_detector.detect_emotions(frame)
                    if result and len(result) > 0:
                        emotions.append(result[0]["emotions"])
                        logger.debug(f"帧 {frame_idx} 检测到表情: {result[0]['emotions']}")
                    else:
                        logger.debug(f"帧 {frame_idx} 未检测到面部")
                except Exception as e:
                    logger.error(f"分析帧 {frame_idx} 时出错: {str(e)}")

        # 释放视频资源
        video.release()
        logger.info(f"共检测到 {len(emotions)} 个帧的表情数据")

        # 如果没有检测到任何表情，返回空结果
        if not emotions:
            logger.warning("未在视频中检测到任何面部表情")
            face_result = {
                "emotions": {},
                "dominant_emotion": "unknown",
                "dominant_emotion_zh": "未知"
            }
        else:
            # 计算平均情绪
            avg_emotions = {}
            for emotion_dict in emotions:
                for emotion, score in emotion_dict.items():
                    avg_emotions[emotion] = avg_emotions.get(emotion, 0) + score / len(emotions)
            
            # 找出主要情绪
            dominant_emotion = max(avg_emotions, key=avg_emotions.get)
            
            face_result = {
                "emotions": avg_emotions,
                "dominant_emotion": dominant_emotion,
                "dominant_emotion_zh": emotion_to_chinese(dominant_emotion)
            }
            
            logger.info(f"面部表情分析结果: {dominant_emotion} ({face_result['dominant_emotion_zh']})")
        
        # 音频处理
        logger.info("开始处理视频中的音频...")
        # 初始化临时文件路径变量
        temp_audio_path = None
        
        try:
            # 检查Whisper模型是否加载
            if whisper_model is None:
                logger.warning("语音识别模型未加载，将跳过音频处理")
                speech_result = {
                    "success": False,
                    "error": "语音识别模型未加载，请稍后再试"
                }
            else:
                try:
                    # 使用moviepy提取音频
                    video_clip = VideoFileClip(video_file)
                    
                    # 检查视频是否有音频轨道
                    if video_clip.audio is None:
                        logger.warning("视频没有音频轨道")
                        speech_result = {
                            "success": False,
                            "error": "视频没有音频轨道"
                        }
                    else:
                        # 创建临时音频文件
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                            temp_audio_path = temp_audio.name
                        
                        # 将音频写入临时文件
                        video_clip.audio.write_audiofile(temp_audio_path, logger=None)
                        
                        # 使用Whisper识别语音
                        text, speech_error = recognize_speech(temp_audio_path, language)
                        
                        if speech_error:
                            logger.warning(f"语音识别出错: {speech_error}")
                            speech_result = {
                                "success": False,
                                "error": speech_error
                            }
                        else:
                            # 对识别出的文本进行情感分析
                            # 检查文本情感分析模型是否加载
                            if model is None or tokenizer is None:
                                logger.warning("文本情感分析模型未加载，将跳过文本情感分析")
                                emotion_result = None
                                emotion_error = "文本情感分析模型未加载"
                            else:
                                emotion_result, emotion_error = analyze_emotion(text)
                            
                            if emotion_error:
                                logger.warning(f"文本情感分析出错: {emotion_error}")
                            
                            speech_result = {
                                "success": True,
                                "text": text,
                                "emotion_analysis": emotion_result,
                                "emotion_error": emotion_error
                            }
                    
                    # 关闭视频对象
                    video_clip.close()
                    
                except Exception as e:
                    logger.error(f"处理视频音频时出错: {str(e)}")
                    speech_result = {
                        "success": False,
                        "error": f"处理视频音频时出错: {str(e)}"
                    }
        finally:
            # 清理临时文件
            if temp_audio_path and os.path.exists(temp_audio_path):
                try:
                    os.remove(temp_audio_path)
                    logger.info(f"删除临时音频文件: {temp_audio_path}")
                except Exception as e:
                    logger.error(f"删除临时音频文件时出错: {str(e)}")
        
        # 计算处理时间
        end_time = time.time()
        processing_time = end_time - start_time
        
        # 综合结果
        result = {
            "face_analysis": face_result,
            "speech_analysis": speech_result,
            "processing_time": processing_time,
            "video_info": {
                "duration": duration,
                "frames": total_frames,
                "fps": fps
            }
        }
        
        # 添加综合情感分析结果
        combined_result = combine_results(face_result, speech_result)
        result["combined_analysis"] = combined_result
        
        logger.info(f"视频处理完成，耗时: {processing_time:.2f}秒")
        
        return result, None
    except Exception as e:
        error_msg = f"处理视频时出错: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


def combine_results(video_result, text_result):
    """综合视频和文本的情感分析结果"""
    try:
        # 如果没有文本结果，只返回视频结果
        if not text_result or "sentiment_class" not in text_result:
            return {
                "source": "face",
                "dominant_emotion": video_result.get("dominant_emotion", "unknown"),
                "dominant_emotion_zh": video_result.get("dominant_emotion_zh", "未知"),
                "confidence": 0.7  # 默认置信度
            }
        
        # 如果没有视频结果，只返回文本结果
        if not video_result or "dominant_emotion" not in video_result:
            sentiment_map = {
                0: "angry",  # 非常消极 -> 愤怒
                1: "sad",    # 消极 -> 悲伤
                2: "neutral", # 中性 -> 中性
                3: "happy",  # 积极 -> 快乐
                4: "happy"   # 非常积极 -> 快乐
            }
            emotion = sentiment_map.get(text_result.get("sentiment_class", 2), "neutral")
            return {
                "source": "text",
                "dominant_emotion": emotion,
                "dominant_emotion_zh": emotion_to_chinese(emotion),
                "confidence": 0.8  # 默认置信度
            }
        
        # 映射文本情感到面部表情
        sentiment_to_emotion = {
            0: "angry",  # 非常消极 -> 愤怒
            1: "sad",    # 消极 -> 悲伤
            2: "neutral", # 中性 -> 中性
            3: "happy",  # 积极 -> 快乐
            4: "happy"   # 非常积极 -> 快乐
        }
        
        text_emotion = sentiment_to_emotion.get(text_result.get("sentiment_class", 2), "neutral")
        face_emotion = video_result.get("dominant_emotion", "neutral")
        
        # 如果两种情感一致，增加置信度
        if text_emotion == face_emotion:
            return {
                "source": "combined",
                "dominant_emotion": face_emotion,
                "dominant_emotion_zh": emotion_to_chinese(face_emotion),
                "confidence": 0.9  # 高置信度
            }
        
        # 否则，根据情况选择一种情感
        # 这里简单地偏向于面部表情结果，可以根据需要调整
        return {
            "source": "face_priority",
            "dominant_emotion": face_emotion,
            "dominant_emotion_zh": emotion_to_chinese(face_emotion),
            "text_emotion": text_emotion,
            "text_emotion_zh": emotion_to_chinese(text_emotion),
            "confidence": 0.7  # 中等置信度
        }
    except Exception as e:
        logger.error(f"合并结果时出错: {str(e)}")
        return {
            "source": "error",
            "dominant_emotion": "unknown",
            "dominant_emotion_zh": "未知",
            "error": str(e),
            "confidence": 0.5  # 低置信度
        }


def handle_video_upload_request(video_file, language="zh-CN"):
    """处理视频上传请求"""
    try:
        # 处理视频文件
        result, error = process_video(video_file, language)
        
        # 即使有错误，也尝试返回部分结果
        if error and result:
            # 有错误但仍有部分结果
            logger.warning(f"视频处理部分成功，错误: {error}")
            return jsonify({
                "success": True,
                "result": result,
                "partial": True,
                "warning": error
            })
        elif error:
            # 完全失败
            return error_response(error)
            
        # 完全成功
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"处理视频上传请求时出错: {str(e)}")
        # 对外部返回通用错误信息
        return error_response("处理视频文件时发生错误，请稍后再试")
