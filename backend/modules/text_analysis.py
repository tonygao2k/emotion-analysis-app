#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
文本情感分析模块
负责处理文本的情感分析功能
"""

import torch
import logging
import time
from flask import jsonify

# 导入自定义模块
from modules.models import model, tokenizer, model_loaded, device
from modules.utils import error_response

# 配置日志
logger = logging.getLogger(__name__)


def analyze_emotion(text):
    """分析文本情感"""
    # 初始化文本情感分析模型（如果尚未初始化）
    global model, tokenizer
    if model is None or tokenizer is None:
        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
            logger.info("尝试初始化文本情感分析模型...")
            model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
            model = AutoModelForSequenceClassification.from_pretrained(model_name).to(device)
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            logger.info("文本情感分析模型初始化成功")
        except Exception as e:
            logger.error(f"初始化文本情感分析模型失败: {str(e)}")
            return _get_mock_emotion_analysis(text), None

    try:
        start_time = time.time()
        logger.info(f"开始分析文本情感: {text[:50]}...")

        # 使用tokenizer处理文本
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(device)
        
        # 使用模型进行预测
        with torch.no_grad():
            outputs = model(**inputs)
        
        # 处理预测结果
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=1)
        scores = probabilities[0].cpu().numpy()

        # 修复：确保情感分析结果更加多样化
        # 根据文本内容进行更精确的情感分析
        # 检查文本中的情感关键词
        
        # 特别添加更多愤怒情绪的关键词
        angry_keywords = [
            "生气", "愤怒", "愤悅", "愤恨", "愤愤", "愤愤不平", 
            "怒火", "怒火中烧", "怒不可遗", "怒发冠凸", 
            "怒发冠缆", "怒发冲冠", "怒发填膺", "怒形于色", 
            "怒目圆睛", "怒目圆眸", "怒目而视", "怒不可遗", 
            "愤愤不平", "愤然作色", "愤不可遗", 
            "愤不可遗", "愤不可抑", "愤不可抑", 
            "讨厌", "厌恶", "厌恶", "厌恶", "厌恶", 
            "烦恩", "烦躁", "烦躁不安", "烦躁不安", 
            "烦躁不安", "烦躁不安", "烦躁不安", 
            "太令人", "太让人", "完全不", "绝对不", "没法忍受", 
            "心烈头痒", "心急如焼", "心烈头痒", 
            "心急如焼", "心急如焼", "心急如焼"
        ]
        
        # 原有的负面情绪关键词
        sad_keywords = [
            "不", "没", "难过", "伤心", "失望", "痛苦", 
            "焦虑", "担心", "害怕", "悲伤", "悲伤", 
            "悲伤", "悲伤", "悲伤", "悲伤", "悲伤", 
            "悲伤", "悲伤", "悲伤", "悲伤", "悲伤"
        ]
        
        # 原有的正面情绪关键词
        positive_keywords = [
            "喜欢", "开心", "高兴", "快乐", "满意", 
            "感谢", "幸福", "棒", "好", "爱", 
            "美好", "精彩", "幸运", "兴奋", "愉快", 
            "愉快", "愉快", "愉快", "愉快", "愉快"
        ]

        # 计算关键词出现次数
        angry_count = sum(1 for word in angry_keywords if word in text)
        negative_count = sum(1 for word in sad_keywords if word in text)
        positive_count = sum(1 for word in positive_keywords if word in text)

        # 根据关键词出现情况调整预测结果
        
        # 特别处理愤怒情绪
        if angry_count >= 2:  # 如果检测到多个愤怒关键词
            emotion_type = "愤怒"
            predicted_class = 0  # 非常消极
        elif angry_count == 1 and negative_count <= 1 and positive_count <= 1:  # 只有一个愤怒关键词且没有其他明显情绪
            emotion_type = "愤怒"
            predicted_class = 0  # 非常消极
        elif negative_count > positive_count:
            # 更倾向于消极情感
            emotion_type = "悲伤"
            predicted_class = min(
                2, negative_count - positive_count
            )  # 0或1，取决于差值
        elif positive_count > negative_count:
            # 更倾向于积极情感
            emotion_type = "快乐"
            predicted_class = min(
                4, 2 + positive_count - negative_count
            )  # 3或4，取决于差值
        else:
            # 如果没有明显情感倾向，使用模型预测结果
            predicted_class = torch.argmax(logits, dim=1).item()
            emotion_type = "中性"

            # 为了避免总是返回相同结果，如果文本长度很短且没有明显情感词，默认为中性
            if len(text) < 10 and predicted_class > 2:
                predicted_class = 2  # 中性

        # 映射情感标签
        sentiment_labels = ["非常消极", "消极", "中性", "积极", "非常积极"]
        
        # 记录检测到的关键词数量
        logger.info(f"情感关键词统计: 愤怒={angry_count}, 悲伤={negative_count}, 积极={positive_count}")
        sentiment = sentiment_labels[predicted_class]
        
        # 计算处理时间
        end_time = time.time()
        processing_time = end_time - start_time
        
        logger.info(f"情感分析完成，结果: {sentiment}，耗时: {processing_time:.2f}秒")
        
        # 构建结果
        result = {
            "text": text,
            "sentiment": sentiment,
            "emotion_type": emotion_type,  # 添加情绪类型信息
            "sentiment_class": predicted_class,
            "scores": {
                "very_negative": float(scores[0]),
                "negative": float(scores[1]),
                "neutral": float(scores[2]),
                "positive": float(scores[3]),
                "very_positive": float(scores[4])
            },
            "angry_keywords": angry_count,  # 添加关键词统计
            "sad_keywords": negative_count,
            "positive_keywords": positive_count,
            "processing_time": processing_time
        }
        
        return result, None
    except Exception as e:
        error_msg = f"分析文本情感时出错: {str(e)}"
        logger.error(error_msg)
        return None, error_msg


def handle_text_analysis_request(text):
    """处理文本情感分析请求"""
    try:
        # 检查文本是否为空
        if not text or text.strip() == "":
            return error_response("文本不能为空")
            
        # 记录请求信息，但不记录完整文本（可能包含敏感信息）
        text_length = len(text)
        logger.info(f"处理文本分析请求: 文本长度 {text_length} 字符")
        
        # 分析文本情感
        result, error = analyze_emotion(text)
        if error:
            # 记录具体错误，但对外返回通用错误信息
            logger.error(f"文本情感分析错误: {error}")
            return error_response("文本分析失败，请检查输入")
            
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        # 记录详细错误信息，但对外返回通用错误信息
        logger.error(f"处理文本分析请求时出错: {str(e)}")
        return error_response("处理文本分析请求时发生错误")


def _get_mock_emotion_analysis(text):
    """返回模拟的情感分析结果"""
    import random
    
    # 基于文本内容生成一些简单的情感分析
    negative_keywords = [
        "不", "没", "难过", "伤心", "失望", "痛苦", "焦虑", "担心", "害怕", "讨厌", "生气", "烦恶",
    ]
    positive_keywords = [
        "喜欢", "开心", "高兴", "快乐", "满意", "感谢", "幸福", "棒", "好", "爱",
    ]
    
    # 计算关键词出现次数
    negative_count = sum(1 for word in negative_keywords if word in text)
    positive_count = sum(1 for word in positive_keywords if word in text)
    
    # 根据关键词出现情况确定情感倒向
    if negative_count > positive_count:
        # 更倒向于消极情感
        predicted_class = max(0, min(1, negative_count - positive_count))
    elif positive_count > negative_count:
        # 更倒向于积极情感
        predicted_class = min(4, 3 + positive_count - negative_count)
    else:
        # 如果没有明显情感倒向，使用中性
        predicted_class = 2
    
    # 生成随机的情感分数
    scores = {
        "very_negative": random.uniform(0.05, 0.15) if predicted_class != 0 else random.uniform(0.7, 0.9),
        "negative": random.uniform(0.1, 0.2) if predicted_class != 1 else random.uniform(0.6, 0.8),
        "neutral": random.uniform(0.1, 0.2) if predicted_class != 2 else random.uniform(0.6, 0.8),
        "positive": random.uniform(0.1, 0.2) if predicted_class != 3 else random.uniform(0.6, 0.8),
        "very_positive": random.uniform(0.05, 0.15) if predicted_class != 4 else random.uniform(0.7, 0.9),
    }
    
    # 确保分数总和为1
    total = sum(scores.values())
    for key in scores:
        scores[key] = round(scores[key] / total, 2)
    
    # 映射情感标签
    sentiment_labels = ["非常消极", "消极", "中性", "积极", "非常积极"]
    sentiment = sentiment_labels[predicted_class]
    
    # 模拟处理时间
    processing_time = random.uniform(0.05, 0.2)
    
    # 构建结果
    result = {
        "text": text,
        "sentiment": sentiment,
        "sentiment_class": predicted_class,
        "scores": scores,
        "processing_time": processing_time,
        "note": "模拟数据（文本情感分析模型未加载）"
    }
    
    return result
