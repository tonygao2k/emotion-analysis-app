#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
生成测试用的音频文件
"""

from gtts import gTTS
import os

def generate_audio_file(text, filename, lang='zh-CN'):
    """
    使用Google Text-to-Speech生成音频文件
    
    参数:
        text: 要转换为语音的文本
        filename: 输出文件名
        lang: 语言代码
    """
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(filename)
    print(f"已生成音频文件: {filename}")

if __name__ == "__main__":
    # 创建一个包含各种情绪的中文文本
    happy_text = "今天真是个好日子，阳光明媚，我感到非常开心和满足。这是我最近几个月来最快乐的一天。"
    sad_text = "昨天我收到了一个不好的消息，让我感到非常难过和失落。我不知道该如何面对接下来的日子。"
    angry_text = "这太令人生气了！我已经说了很多次了，但是他们就是不听，总是犯同样的错误！"
    neutral_text = "根据最新的天气预报，明天将会是晴天，气温在20到25度之间，适合户外活动。"
    
    # 生成不同情绪的音频文件
    generate_audio_file(happy_text, "happy_sample.mp3")
    generate_audio_file(sad_text, "sad_sample.mp3")
    generate_audio_file(angry_text, "angry_sample.mp3")
    generate_audio_file(neutral_text, "neutral_sample.mp3")
    
    # 生成一个包含混合情绪的较长音频
    mixed_text = """
    大家好，我是情感分析测试。
    今天我想和大家分享一些我的感受。
    首先，我非常高兴能够参与这个项目，这给了我很大的成就感。
    但是昨天发生的事情让我有点失落，我本来期待的活动被取消了。
    有时候我也会感到生气，特别是当计划被无故打乱的时候。
    不过总的来说，我对未来还是充满期待的，相信一切都会变得更好。
    """
    
    generate_audio_file(mixed_text, "mixed_emotions_sample.mp3")
    
    print("所有音频文件生成完成！")
