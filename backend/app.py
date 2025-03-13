#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import torch
import base64
import tempfile
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import whisper
from threading import Thread
from werkzeug.utils import secure_filename
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用CORS支持跨域请求

# 配置
MODEL_NAME = "nlptown/bert-base-multilingual-uncased-sentiment"
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {"wav", "mp3", "flac"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 限制上传文件大小为16MB

# 全局变量
model = None
tokenizer = None
whisper_model = None
device = "cuda:0" if torch.cuda.is_available() else "cpu"
model_loaded = False
loading_thread = None


def allowed_file(filename):
    """检查文件是否允许上传"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_model():
    """加载模型"""
    global model, tokenizer, whisper_model, model_loaded
    try:
        logger.info(f"使用设备: {device}")
        logger.info("加载分词器...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        logger.info("加载情感分析模型...")
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(
            device
        )

        logger.info("加载Whisper语音识别模型...")
        # 使用tiny模型以提高速度，如需更高准确率可使用base或small
        whisper_model = whisper.load_model("tiny")

        logger.info("所有模型加载完成")
        model_loaded = True
    except Exception as e:
        logger.error(f"加载模型时出错: {e}")
        model_loaded = False


def recognize_speech(audio_file, language="zh-CN"):
    """使用Whisper识别语音"""
    global whisper_model, model_loaded

    if not model_loaded or whisper_model is None:
        logger.warning("语音识别模型尚未加载完成，请稍后再试")
        return {"success": False, "text": "语音识别模型尚未加载完成，请稍后再试"}

    try:
        logger.info(f"开始识别音频文件: {audio_file}")
        # 使用Whisper进行语音识别
        result = whisper_model.transcribe(audio_file, language=language[:2])
        transcribed_text = result["text"].strip()

        if not transcribed_text:
            logger.warning("未能识别出任何文本")
            return {
                "success": False,
                "text": "未能识别出任何文本，请重新录音或直接输入文本",
            }

        logger.info(f"语音识别结果: {transcribed_text}")
        return {"success": True, "text": transcribed_text}
    except Exception as e:
        logger.error(f"语音识别失败: {str(e)}")
        return {"success": False, "text": f"语音识别失败: {str(e)}"}


def analyze_emotion(text):
    """分析文本情感"""
    global model, tokenizer, model_loaded

    if not model_loaded:
        return {"success": False, "error": "模型未加载"}

    try:
        # 预处理文本
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(
            device
        )

        # 预测
        with torch.no_grad():
            outputs = model(**inputs)

        # 获取预测结果
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=1)
        scores = probabilities[0].cpu().numpy()
        predicted_class = torch.argmax(logits, dim=1).item()

        # 映射情感标签
        emotions = {
            0: "非常消极",  # 1星
            1: "消极",  # 2星
            2: "中性",  # 3星
            3: "积极",  # 4星
            4: "非常积极",  # 5星
        }

        result = emotions[predicted_class]

        # 返回结果
        return {
            "success": True,
            "result": result,
            "scores": scores.tolist(),
            "predicted_class": predicted_class,
        }
    except Exception as e:
        logger.error(f"分析出错: {str(e)}")
        return {"success": False, "error": f"分析出错: {str(e)}"}


@app.route("/api/status", methods=["GET"])
def status():
    """获取模型加载状态"""
    return jsonify({"model_loaded": model_loaded})


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """分析文本API"""
    if not request.json or "text" not in request.json:
        return jsonify({"success": False, "error": "请提供文本数据"}), 400

    text = request.json["text"]
    if not text:
        return jsonify({"success": False, "error": "文本内容为空"}), 400

    language = request.json.get("language", "zh-CN")
    result = analyze_emotion(text)
    return jsonify(result)


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """上传音频文件API"""
    if "file" not in request.files:
        return jsonify({"success": False, "error": "没有文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "未选择文件"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        language = request.form.get("language", "zh-CN")

        # 识别语音
        speech_result = recognize_speech(filepath, language)
        if not speech_result["success"]:
            return jsonify(speech_result), 400

        text = speech_result["text"]

        # 分析情感
        emotion_result = analyze_emotion(text)

        # 删除临时文件
        try:
            os.remove(filepath)
        except:
            pass

        return jsonify({"success": True, "text": text, "emotion": emotion_result})

    return jsonify({"success": False, "error": "不支持的文件类型"}), 400


@app.route("/api/record", methods=["POST"])
def api_record():
    """处理录音数据API"""
    if "audio" not in request.json:
        return jsonify({"success": False, "error": "没有音频数据"}), 400

    audio_data = request.json["audio"]
    language = request.json.get("language", "zh-CN")

    # 解码Base64音频数据
    try:
        audio_bytes = base64.b64decode(audio_data.split(",")[1])
    except:
        return jsonify({"success": False, "error": "音频数据格式错误"}), 400

    # 保存为临时文件
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    temp_file.write(audio_bytes)
    temp_file.close()

    # 识别语音
    speech_result = recognize_speech(temp_file.name, language)

    # 删除临时文件
    try:
        os.remove(temp_file.name)
    except:
        pass

    if not speech_result["success"]:
        return jsonify(speech_result), 400

    text = speech_result["text"]

    # 分析情感
    emotion_result = analyze_emotion(text)

    return jsonify({"success": True, "text": text, "emotion": emotion_result})


if __name__ == "__main__":
    # 在后台线程中加载模型
    loading_thread = Thread(target=load_model)
    loading_thread.daemon = True
    loading_thread.start()

    app.run(debug=True, host="0.0.0.0", port=5001)
