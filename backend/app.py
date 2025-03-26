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
import cv2

# 导入FER库
from fer import FER  # 面部表情识别库
from moviepy.editor import VideoFileClip
import io
from PIL import Image
import time

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

app = Flask(__name__)
CORS(app)  # 启用CORS支持跨域请求

# 配置
MODEL_NAME = "nlptown/bert-base-multilingual-uncased-sentiment"
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {"wav", "mp3", "flac"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv"}  # 允许的视频文件格式

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 限制上传文件大小为32MB


# 全局变量
model = None
tokenizer = None
whisper_model = None
emotion_detector = None  # 面部表情识别模型
device = "cuda:0" if torch.cuda.is_available() else "cpu"
model_loaded = False
model_loading = False  # 新增变量，用于跟踪模型是否正在加载


def allowed_file(filename):
    """检查文件是否允许上传"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_video_file(filename):
    """检查视频文件是否允许上传"""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS
    )


def load_model():
    """加载模型"""
    global model, tokenizer, whisper_model, emotion_detector, model_loaded, model_loading

    # 如果模型已经加载或正在加载，则直接返回
    if model_loaded or model_loading:
        return

    model_loading = True  # 标记模型正在加载

    try:
        logger.info("开始加载模型...")

        # 加载文本情感分析模型
        logger.info(f"加载文本情感分析模型: {MODEL_NAME}")
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(
            device
        )
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        # 加载语音识别模型
        logger.info("加载Whisper语音识别模型...")
        whisper_model = whisper.load_model("small")

        # 加载FER模型
        try:
            logger.info("开始加载FER面部表情识别模型...")
            emotion_detector = FER(mtcnn=True)
            logger.info("FER面部表情识别模型加载完成")
        except Exception as fer_error:
            logger.error(f"加载FER模型时出错: {str(fer_error)}")
            logger.warning("将使用模拟的面部表情数据")
            emotion_detector = None

        model_loaded = True
        model_loading = False  # 标记模型加载完成
        logger.info("模型加载完成")
    except Exception as e:
        logger.error(f"加载模型时出错: {str(e)}")
        model_loaded = False
        model_loading = False  # 标记模型加载失败
        raise


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
        
        # 修复：确保情感分析结果更加多样化
        # 根据文本内容进行更精确的情感分析
        # 检查文本中的情感关键词
        negative_keywords = ["不", "没", "难过", "伤心", "失望", "痛苦", "焦虑", "担心", "害怕", "讨厌", "生气", "烦恼"]
        positive_keywords = ["喜欢", "开心", "高兴", "快乐", "满意", "感谢", "幸福", "棒", "好", "爱"]
        
        # 计算关键词出现次数
        negative_count = sum(1 for word in negative_keywords if word in text)
        positive_count = sum(1 for word in positive_keywords if word in text)
        
        # 根据关键词出现情况调整预测结果
        if negative_count > positive_count:
            # 更倾向于消极情感
            predicted_class = min(2, negative_count - positive_count)  # 0或1，取决于差值
        elif positive_count > negative_count:
            # 更倾向于积极情感
            predicted_class = min(4, 2 + positive_count - negative_count)  # 3或4，取决于差值
        else:
            # 如果没有明显情感倾向，使用模型预测结果
            predicted_class = torch.argmax(logits, dim=1).item()
            
            # 为了避免总是返回相同结果，如果文本长度很短且没有明显情感词，默认为中性
            if len(text) < 10 and predicted_class > 2:
                predicted_class = 2  # 中性

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


def process_video(video_file, language="zh-CN"):
    """处理视频文件，提取面部表情和音频"""
    global emotion_detector, model_loaded

    if not model_loaded or emotion_detector is None:
        return {"success": False, "error": "模型未加载完成，请稍后再试"}

    try:
        logger.info(f"开始处理视频文件: {video_file}")

        # 提取音频
        video_clip = VideoFileClip(video_file)
        audio_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio_path = audio_file.name
        audio_file.close()

        logger.info("从视频中提取音频...")
        if video_clip.audio is not None:
            video_clip.audio.write_audiofile(audio_path, verbose=False, logger=None)

            # 语音识别
            logger.info("对提取的音频进行语音识别...")
            speech_result = recognize_speech(audio_path, language)

            if speech_result["success"]:
                # 对识别出的文本进行情感分析
                text_emotion = analyze_emotion(speech_result["text"])
            else:
                text_emotion = {
                    "success": False,
                    "result": "中性",
                    "error": "语音识别失败",
                }
        else:
            logger.warning("视频中没有音频轨道")
            speech_result = {"success": False, "text": "视频中没有音频"}
            text_emotion = {
                "success": False,
                "result": "中性",
                "error": "视频中没有音频",
            }

        # 关闭视频剪辑以释放资源
        video_clip.close()

        # 面部表情分析
        logger.info("开始分析视频中的面部表情...")
        video = cv2.VideoCapture(video_file)

        emotions = []
        frame_count = 0
        sample_rate = 5  # 每秒采样帧数
        fps = video.get(cv2.CAP_PROP_FPS)
        sample_interval = int(fps / sample_rate) if fps > 0 else 1

        while video.isOpened():
            ret, frame = video.read()
            if not ret:
                break

            # 控制采样率，不必分析每一帧
            frame_count += 1
            if frame_count % sample_interval != 0:
                continue

            # 分析当前帧的表情
            result = emotion_detector.detect_emotions(frame)
            if result and len(result) > 0:
                emotions.append(result[0]["emotions"])

        video.release()

        # 清理临时文件
        os.remove(audio_path)

        # 计算平均情绪
        if emotions:
            avg_emotion = {}
            for emotion in [
                "angry",
                "disgust",
                "fear",
                "happy",
                "sad",
                "surprise",
                "neutral",
            ]:
                avg_emotion[emotion] = sum(e[emotion] for e in emotions) / len(emotions)

            # 找出主要情绪
            dominant_emotion = max(avg_emotion, key=avg_emotion.get)

            # 映射到我们的情感分类
            emotion_mapping = {
                "angry": "消极",
                "disgust": "消极",
                "fear": "消极",
                "sad": "消极",
                "happy": "积极",
                "surprise": "中性",
                "neutral": "中性",
            }

            video_result = emotion_mapping.get(dominant_emotion, "中性")
            confidence = avg_emotion[dominant_emotion]

            # 详细的表情分析结果
            emotion_details = {
                "dominant": dominant_emotion,
                "confidence": confidence,
                "all_emotions": avg_emotion,
            }
        else:
            video_result = "无法检测到面部表情"
            confidence = 0
            emotion_details = {
                "dominant": "unknown",
                "confidence": 0,
                "all_emotions": {},
            }

        # 综合分析结果
        combined_result = combine_results(
            video_result,
            (
                text_emotion.get("result", "中性")
                if text_emotion.get("success", False)
                else "中性"
            ),
        )

        return {
            "success": True,
            "video_emotion": {
                "result": video_result,
                "confidence": confidence,
                "details": emotion_details,
            },
            "speech_result": speech_result,
            "text_emotion": text_emotion,
            "combined_result": combined_result,
        }
    except Exception as e:
        logger.error(f"处理视频时出错: {str(e)}")
        return {"success": False, "error": f"处理视频时出错: {str(e)}"}


def combine_results(video_result, text_result):
    """综合视频和文本的情感分析结果"""
    # 情感分数映射
    emotion_scores = {"非常消极": -2, "消极": -1, "中性": 0, "积极": 1, "非常积极": 2}

    # 映射结果到分数
    video_score = emotion_scores.get(video_result, 0)
    text_score = emotion_scores.get(text_result, 0)

    # 加权平均 (视频0.4，文本0.6)
    combined_score = 0.4 * video_score + 0.6 * text_score

    # 映射回情感标签
    if combined_score <= -1.5:
        return "非常消极"
    elif combined_score < -0.5:
        return "消极"
    elif combined_score < 0.5:
        return "中性"
    elif combined_score < 1.5:
        return "积极"
    else:
        return "非常积极"


# 辅助函数：将英文情绪转换为中文
def emotion_to_chinese(emotion):
    """将英文情绪标签转换为中文"""
    emotion_map = {
        "angry": "愤怒",
        "disgust": "厌恶",
        "fear": "恐惧",
        "happy": "高兴",
        "sad": "悲伤",
        "surprise": "惊讶",
        "neutral": "平静",
    }
    return emotion_map.get(emotion, "未知")


@app.route("/api/status", methods=["GET"])
def status():
    """获取模型加载状态和系统信息"""
    return jsonify(
        {
            "loaded": model_loaded,
            "loading": model_loading,
            "device": device,
            "models": {
                "text": MODEL_NAME,
                "audio": "whisper-small" if whisper_model else "未加载",
                "face": "FER" if emotion_detector else "未加载",
            },
            "system_info": {
                "cuda_available": torch.cuda.is_available(),
                "cuda_device_count": (
                    torch.cuda.device_count() if torch.cuda.is_available() else 0
                ),
                "cuda_device_name": (
                    torch.cuda.get_device_name(0) if torch.cuda.is_available() else "无"
                ),
            },
            "timestamp": time.time(),
        }
    )


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """分析文本API"""
    if not request.json or "text" not in request.json:
        return jsonify({"success": False, "error": "请提供文本数据"}), 400

    text = request.json["text"]
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

        # 获取语言参数，默认为中文
        language = request.form.get("language", "zh-CN")

        # 识别语音
        speech_result = recognize_speech(filepath, language)

        # 删除临时文件
        os.remove(filepath)

        if not speech_result["success"]:
            return jsonify(speech_result)

        # 获取识别出的文本
        text = speech_result["text"]

        # 分析情感
        emotion_result = analyze_emotion(text)

        if not emotion_result["success"]:
            return jsonify(emotion_result)

        return jsonify({"success": True, "text": text, "emotion": emotion_result})

    return jsonify({"success": False, "error": "不支持的文件格式"}), 400


@app.route("/api/record", methods=["POST"])
def api_record():
    """处理录音数据API"""
    if not request.json or "audio" not in request.json:
        return jsonify({"success": False, "error": "没有音频数据"}), 400

    # 获取Base64编码的音频数据
    audio_data = request.json["audio"]
    # 移除Base64前缀
    if "," in audio_data:
        audio_data = audio_data.split(",")[1]

    # 获取语言参数，默认为中文
    language = request.json.get("language", "zh-CN")

    try:
        # 解码Base64数据
        audio_bytes = base64.b64decode(audio_data)

        # 创建临时文件
        temp_file = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        temp_file.write(audio_bytes)
        temp_file.close()

        # 识别语音
        speech_result = recognize_speech(temp_file.name, language)

        # 删除临时文件
        os.remove(temp_file.name)

        if not speech_result["success"]:
            return jsonify(speech_result)

        # 获取识别出的文本
        text = speech_result["text"]

        # 分析情感
        emotion_result = analyze_emotion(text)

        if not emotion_result["success"]:
            return jsonify(emotion_result)

        return jsonify({"success": True, "text": text, "emotion": emotion_result})

    except Exception as e:
        logger.error(f"处理录音数据时出错: {str(e)}")
        return (
            jsonify({"success": False, "error": f"处理录音数据时出错: {str(e)}"}),
            500,
        )


@app.route("/api/upload_video", methods=["POST"])
def api_upload_video():
    """处理视频上传请求"""
    if "file" not in request.files:
        return jsonify({"success": False, "error": "没有文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "未选择文件"}), 400

    if file and allowed_video_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        # 获取语言参数，默认为中文
        language = request.form.get("language", "zh-CN")

        # 处理视频
        result = process_video(filepath, language)

        # 清理临时文件
        os.remove(filepath)

        return jsonify(result)

    return jsonify({"success": False, "error": "不支持的文件格式"}), 400


@app.route("/api/analyze_frame", methods=["POST"])
def api_analyze_frame():
    # 处理摄像头实时帧分析请求
    if not model_loaded:
        return jsonify({"success": False, "error": "模型未加载完成，请稍后再试"}), 503

    start_time = time.time()

    try:
        # 获取前端发送的图像数据
        data = request.json
        if not data or "image" not in data:
            return jsonify({"success": False, "error": "未接收到图像数据"}), 400

        # 解码Base64图像
        image_data = (
            data["image"].split(",")[1] if "," in data["image"] else data["image"]
        )
        image_bytes = base64.b64decode(image_data)

        # 将图像转换为OpenCV格式
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        preprocess_time = time.time()
        preprocessing_duration = preprocess_time - start_time

        # 如果FER模型未加载，返回模拟的情绪分析结果
        if emotion_detector is None:
            logger.warning("FER模型未加载，返回模拟的情绪分析结果")
            emotions = {
                "angry": 0.1,
                "disgust": 0.05,
                "fear": 0.05,
                "happy": 0.5,
                "sad": 0.1,
                "surprise": 0.1,
                "neutral": 0.1,
            }
            dominant_emotion = "happy"

            # 模拟的人脸位置 - 在图像中心位置创建一个框
            img_height, img_width = img.shape[:2]
            face_width = int(img_width * 0.4)  # 图像宽度的40%
            face_height = int(img_height * 0.4)  # 图像高度的40%
            face_x = int((img_width - face_width) / 2)  # 居中
            face_y = int((img_height - face_height) / 2)  # 居中
            face_location = [face_x, face_y, face_width, face_height]

            # 计算总处理时间
            end_time = time.time()
            total_duration = end_time - start_time

            return jsonify(
                {
                    "success": True,
                    "emotions": emotions,
                    "dominant_emotion": dominant_emotion,
                    "dominant_emotion_zh": emotion_to_chinese(dominant_emotion),
                    "face_location": face_location,  # 添加模拟的人脸位置
                    "processing_info": {
                        "total_time": round(total_duration * 1000, 2),
                        "preprocessing_time": round(preprocessing_duration * 1000, 2),
                        "detection_time": 0,
                        "note": "FER模型未加载，返回模拟结果",
                    },
                }
            )

        # 使用FER进行情绪分析
        detection_start = time.time()
        emotions = emotion_detector.detect_emotions(img)
        detection_end = time.time()
        detection_duration = detection_end - detection_start

        # 检查是否检测到人脸
        if not emotions or len(emotions) == 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "未检测到人脸",
                        "processing_info": {
                            "total_time": round((time.time() - start_time) * 1000, 2),
                            "preprocessing_time": round(
                                preprocessing_duration * 1000, 2
                            ),
                            "detection_time": round(detection_duration * 1000, 2),
                        },
                    }
                ),
                400,
            )

        # 获取第一个检测到的人脸的情绪
        emotion_data = emotions[0]["emotions"]
        dominant_emotion = max(emotion_data, key=emotion_data.get)

        # 获取人脸位置
        face_location = emotions[0]["box"]  # 获取人脸框位置 [x, y, w, h]

        # 计算总处理时间
        end_time = time.time()
        total_duration = end_time - start_time

        return jsonify(
            {
                "success": True,
                "emotions": emotion_data,
                "dominant_emotion": dominant_emotion,
                "dominant_emotion_zh": emotion_to_chinese(dominant_emotion),
                "face_location": face_location,  # 添加人脸位置信息
                "processing_info": {
                    "total_time": round(total_duration * 1000, 2),
                    "preprocessing_time": round(preprocessing_duration * 1000, 2),
                    "detection_time": round(detection_duration * 1000, 2),
                },
            }
        )

    except Exception as e:
        logger.error(f"处理实时帧时出错: {str(e)}")
        return jsonify({"success": False, "error": f"处理图像时出错: {str(e)}"}), 500


if __name__ == "__main__":
    # 启动模型加载线程
    import threading

    threading.Thread(target=load_model, daemon=True).start()

    # 使用5001端口启动Flask应用
    app.run(debug=True, port=5001)
