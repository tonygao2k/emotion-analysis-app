#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
生成测试用的视频文件
"""

import cv2
import numpy as np
import os
from PIL import Image, ImageDraw, ImageFont
import time

def create_text_frame(text, width=640, height=480, bg_color=(255, 255, 255), text_color=(0, 0, 0)):
    """创建带有文字的帧"""
    # 创建白色背景图像
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # 尝试加载中文字体，如果失败则使用默认字体
    try:
        # 对于macOS，尝试使用系统中文字体
        font = ImageFont.truetype('/System/Library/Fonts/PingFang.ttc', 30)
    except IOError:
        try:
            # 尝试使用Arial Unicode MS
            font = ImageFont.truetype('Arial Unicode.ttf', 30)
        except IOError:
            # 如果都失败，使用默认字体
            font = ImageFont.load_default()
    
    # 计算文本位置使其居中
    text_width, text_height = draw.textsize(text, font=font) if hasattr(draw, 'textsize') else (width//2, height//2)
    position = ((width - text_width) // 2, (height - text_height) // 2)
    
    # 绘制文本
    draw.text(position, text, font=font, fill=text_color)
    
    # 转换为OpenCV格式
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def create_emotion_video(filename, emotion, duration=5, fps=30):
    """创建表达特定情绪的视频"""
    width, height = 640, 480
    
    # 设置视频编码器
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # MP4格式
    out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
    
    # 根据情绪设置背景和文字颜色
    if emotion == "happy":
        bg_color = (255, 255, 200)  # 淡黄色背景
        text_color = (0, 128, 0)    # 绿色文字
        text = "这是一个表达'开心'情绪的测试视频\n用于测试情感分析功能"
    elif emotion == "sad":
        bg_color = (200, 200, 255)  # 淡蓝色背景
        text_color = (0, 0, 128)    # 蓝色文字
        text = "这是一个表达'悲伤'情绪的测试视频\n用于测试情感分析功能"
    elif emotion == "angry":
        bg_color = (200, 100, 100)  # 淡红色背景
        text_color = (128, 0, 0)    # 红色文字
        text = "这是一个表达'愤怒'情绪的测试视频\n用于测试情感分析功能"
    else:  # neutral
        bg_color = (240, 240, 240)  # 灰色背景
        text_color = (0, 0, 0)      # 黑色文字
        text = "这是一个表达'中性'情绪的测试视频\n用于测试情感分析功能"
    
    # 生成并写入帧
    for _ in range(int(fps * duration)):
        frame = create_text_frame(text, width, height, bg_color, text_color)
        out.write(frame)
    
    # 释放资源
    out.release()
    print(f"已生成视频文件: {filename}")

if __name__ == "__main__":
    # 确保输出目录存在
    output_dir = "examples/video"
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建不同情绪的测试视频
    create_emotion_video(os.path.join(output_dir, "happy_test.mp4"), "happy")
    create_emotion_video(os.path.join(output_dir, "sad_test.mp4"), "sad")
    create_emotion_video(os.path.join(output_dir, "angry_test.mp4"), "angry")
    create_emotion_video(os.path.join(output_dir, "neutral_test.mp4"), "neutral")
    
    print("所有测试视频生成完成！")
