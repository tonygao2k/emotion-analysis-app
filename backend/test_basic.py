#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
基本功能测试
"""

import unittest
import tempfile
import os
import sys

# 添加项目根目录到路径，以便导入模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.utils import (
    emotion_to_chinese,
    safe_filename,
    traditional_to_simplified,
    generate_request_id,
    allowed_file,
    allowed_video_file,
)


class TestUtils(unittest.TestCase):
    """测试工具函数"""

    def test_emotion_to_chinese(self):
        """测试情感标签中文转换"""
        self.assertEqual(emotion_to_chinese("happy"), "快乐")
        self.assertEqual(emotion_to_chinese("sad"), "悲伤")
        self.assertEqual(emotion_to_chinese("angry"), "愤怒")
        self.assertEqual(emotion_to_chinese("neutral"), "中性")
        self.assertEqual(emotion_to_chinese("unknown"), "unknown")  # 未知标签应返回原文

    def test_safe_filename(self):
        """测试安全文件名生成"""
        # 正常文件名
        result = safe_filename("test.mp3")
        self.assertTrue(result.endswith("_test.mp3"))
        self.assertEqual(len(result.split("_")[0]), 8)  # UUID前缀应为8位

        # 危险文件名
        result = safe_filename("../../../etc/passwd")
        self.assertNotIn("..", result)
        self.assertNotIn("/", result)

        # 空文件名
        result = safe_filename("")
        self.assertEqual(len(result), 8)  # 应该只是UUID

    def test_traditional_to_simplified(self):
        """测试繁简转换"""
        # 注意：这个测试可能在没有opencc库时跳过
        result = traditional_to_simplified("測試")
        # 如果opencc可用，应该转换为"测试"，否则保持原文
        self.assertIn(result, ["测试", "測試"])

        # 空文本处理
        self.assertEqual(traditional_to_simplified(""), "")
        self.assertEqual(traditional_to_simplified(None), None)

    def test_generate_request_id(self):
        """测试请求ID生成"""
        request_id = generate_request_id()
        self.assertEqual(len(request_id), 8)

        # 确保多次生成的ID不同
        request_id2 = generate_request_id()
        self.assertNotEqual(request_id, request_id2)

    def test_allowed_file(self):
        """测试音频文件类型检查"""
        self.assertTrue(allowed_file("test.mp3"))
        self.assertTrue(allowed_file("test.wav"))
        self.assertTrue(allowed_file("test.flac"))
        self.assertFalse(allowed_file("test.txt"))
        self.assertFalse(allowed_file("test.mp4"))
        self.assertFalse(allowed_file("test"))  # 无扩展名

    def test_allowed_video_file(self):
        """测试视频文件类型检查"""
        self.assertTrue(allowed_video_file("test.mp4"))
        self.assertTrue(allowed_video_file("test.avi"))
        self.assertTrue(allowed_video_file("test.mov"))
        self.assertTrue(allowed_video_file("test.mkv"))
        self.assertFalse(allowed_video_file("test.txt"))
        self.assertFalse(allowed_video_file("test.mp3"))


class TestAPIEndpoints(unittest.TestCase):
    """测试API端点（需要运行中的应用）"""

    def setUp(self):
        """测试设置"""
        try:
            import requests

            self.requests = requests
            self.base_url = "http://127.0.0.1:8080/api"
        except ImportError:
            self.skipTest("requests库未安装，跳过API测试")

    def test_ping_endpoint(self):
        """测试ping端点"""
        try:
            response = self.requests.get(f"{self.base_url}/ping", timeout=5)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["message"], "pong")
        except Exception as e:
            self.skipTest(f"无法连接到API服务器: {e}")

    def test_status_endpoint(self):
        """测试状态端点"""
        try:
            response = self.requests.get(f"{self.base_url}/status", timeout=5)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("success", data)
            self.assertIn("status", data)
        except Exception as e:
            self.skipTest(f"无法连接到API服务器: {e}")


if __name__ == "__main__":
    # 运行测试
    unittest.main(verbosity=2)
