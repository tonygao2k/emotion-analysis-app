#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
模型管理模块
负责加载和管理各种AI模型
"""

import os
import time
import torch
import logging
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import whisper
from fer import FER

# 配置日志
logger = logging.getLogger(__name__)

# 全局变量
model = None
tokenizer = None
whisper_model = None
emotion_detector = None
device = "cuda:0" if torch.cuda.is_available() else "cpu"
model_loaded = False
model_loading = False
last_model_load_time = 0

# 从环境变量获取配置
MODEL_NAME = os.environ.get("MODEL_NAME", "nlptown/bert-base-multilingual-uncased-sentiment")
MODEL_RELOAD_INTERVAL = int(os.environ.get("MODEL_RELOAD_INTERVAL", 24 * 60 * 60))  # 默认24小时


def load_model(force_success=False):
    """加载所有模型
    
    Args:
        force_success (bool, optional): 如果为True，即使模型加载失败也会将模型状态设置为已加载。默认为False。
    """
    global model, tokenizer, whisper_model, emotion_detector, model_loaded, model_loading, last_model_load_time

    # 如果强制成功，直接设置模型为已加载状态
    if force_success:
        logger.warning("强制设置模型为已加载状态")
        model_loaded = True
        model_loading = False
        last_model_load_time = time.time()
        return

    current_time = time.time()

    # 如果模型已加载但超过指定时间，考虑重新加载
    if model_loaded and (current_time - last_model_load_time > MODEL_RELOAD_INTERVAL):
        logger.info(f"模型已加载超过{MODEL_RELOAD_INTERVAL/3600}小时，准备重新加载...")
        model_loaded = False

    # 如果模型已经加载或正在加载，则直接返回
    if model_loaded or model_loading:
        return

    model_loading = True  # 标记模型正在加载

    try:
        logger.info("开始加载模型...")

        # 加载文本情感分析模型
        try:
            logger.info(f"加载文本情感分析模型: {MODEL_NAME}")
            model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(device)
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            logger.info("文本情感分析模型加载成功")
        except Exception as e:
            logger.error(f"加载文本情感分析模型时出错: {str(e)}")
            if not force_success:
                raise

        # 加载语音识别模型
        try:
            logger.info("加载Whisper语音识别模型...")
            whisper_model = whisper.load_model("base")
            logger.info("Whisper语音识别模型加载成功")
        except Exception as e:
            logger.error(f"加载Whisper语音识别模型时出错: {str(e)}")
            if not force_success:
                raise

        # 加载面部表情识别模型
        try:
            logger.info("加载面部表情识别模型...")
            emotion_detector = FER(mtcnn=True)
            logger.info("面部表情识别模型加载成功")
        except Exception as e:
            logger.error(f"加载面部表情识别模型时出错: {str(e)}")
            if not force_success:
                raise

        # 更新模型状态
        model_loaded = True
        last_model_load_time = time.time()
        logger.info(f"所有模型加载完成，耗时: {last_model_load_time - current_time:.2f}秒")
    except Exception as e:
        logger.error(f"加载模型时出错: {str(e)}")
        model_loading = False
        if force_success:
            logger.warning("虽然模型加载出错，但由于force_success=True，仍将模型状态设置为已加载")
            model_loaded = True
            last_model_load_time = time.time()
        else:
            raise
    finally:
        model_loading = False


def get_model_status():
    """获取模型加载状态"""
    return {
        "loaded": model_loaded,
        "loading": model_loading,
        "last_load_time": last_model_load_time,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "model_name": MODEL_NAME
    }
