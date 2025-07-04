#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
性能监控模块
用于监控API性能和系统资源使用情况
"""

import time
import logging
import threading
import functools
from collections import defaultdict, deque
import os
import psutil

logger = logging.getLogger(__name__)

# 全局性能统计
performance_stats = {
    "requests": defaultdict(list),  # 按端点记录请求时间
    "errors": defaultdict(int),  # 按端点记录错误次数
    "total_requests": 0,
    "start_time": time.time(),
}

# 系统资源监控
system_stats = {
    "cpu_usage": deque(maxlen=60),  # 最近60次CPU使用率
    "memory_usage": deque(maxlen=60),  # 最近60次内存使用率
    "last_update": 0,
}

# 线程锁
stats_lock = threading.Lock()


def monitor_performance(endpoint_name):
    """性能监控装饰器"""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            endpoint = endpoint_name or func.__name__

            try:
                result = func(*args, **kwargs)

                # 记录成功的请求
                duration = time.time() - start_time
                record_request(endpoint, duration, success=True)

                return result

            except Exception as e:
                # 记录失败的请求
                duration = time.time() - start_time
                record_request(endpoint, duration, success=False)
                record_error(endpoint)

                logger.error(f"端点 {endpoint} 执行失败: {str(e)}")
                raise

        return wrapper

    return decorator


def record_request(endpoint, duration, success=True):
    """记录请求性能数据"""
    with stats_lock:
        performance_stats["requests"][endpoint].append(
            {"duration": duration, "timestamp": time.time(), "success": success}
        )

        # 保留最近100次请求记录
        if len(performance_stats["requests"][endpoint]) > 100:
            performance_stats["requests"][endpoint] = performance_stats["requests"][
                endpoint
            ][-100:]

        performance_stats["total_requests"] += 1


def record_error(endpoint):
    """记录错误"""
    with stats_lock:
        performance_stats["errors"][endpoint] += 1


def update_system_stats():
    """更新系统资源统计"""
    current_time = time.time()

    # 每5秒更新一次
    if current_time - system_stats["last_update"] < 5:
        return

    try:
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=None)
        system_stats["cpu_usage"].append(
            {"value": cpu_percent, "timestamp": current_time}
        )

        # 内存使用率
        memory = psutil.virtual_memory()
        system_stats["memory_usage"].append(
            {"value": memory.percent, "timestamp": current_time}
        )

        system_stats["last_update"] = current_time

    except Exception as e:
        logger.warning(f"更新系统统计时出错: {str(e)}")


def get_performance_summary():
    """获取性能摘要"""
    with stats_lock:
        summary = {
            "uptime": time.time() - performance_stats["start_time"],
            "total_requests": performance_stats["total_requests"],
            "endpoints": {},
        }

        # 计算各端点的统计信息
        for endpoint, requests in performance_stats["requests"].items():
            if not requests:
                continue

            durations = [r["duration"] for r in requests]
            success_count = sum(1 for r in requests if r["success"])

            summary["endpoints"][endpoint] = {
                "total_requests": len(requests),
                "success_count": success_count,
                "error_count": performance_stats["errors"][endpoint],
                "success_rate": success_count / len(requests) * 100 if requests else 0,
                "avg_duration": sum(durations) / len(durations) if durations else 0,
                "min_duration": min(durations) if durations else 0,
                "max_duration": max(durations) if durations else 0,
            }

    # 更新系统统计
    update_system_stats()

    # 添加系统资源信息
    summary["system"] = {
        "current_cpu": psutil.cpu_percent(interval=None),
        "current_memory": psutil.virtual_memory().percent,
        "cpu_history": list(system_stats["cpu_usage"]),
        "memory_history": list(system_stats["memory_usage"]),
    }

    return summary


def get_health_status():
    """获取系统健康状态"""
    try:
        # 获取基本系统信息
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # 判断健康状态
        is_healthy = True
        warnings = []

        if cpu_percent > 80:
            is_healthy = False
            warnings.append(f"CPU使用率过高: {cpu_percent:.1f}%")

        if memory.percent > 85:
            is_healthy = False
            warnings.append(f"内存使用率过高: {memory.percent:.1f}%")

        if disk.percent > 90:
            is_healthy = False
            warnings.append(f"磁盘使用率过高: {disk.percent:.1f}%")

        return {
            "healthy": is_healthy,
            "warnings": warnings,
            "metrics": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3),
            },
            "uptime": time.time() - performance_stats["start_time"],
        }

    except Exception as e:
        logger.error(f"获取健康状态时出错: {str(e)}")
        return {
            "healthy": False,
            "warnings": [f"无法获取系统信息: {str(e)}"],
            "metrics": {},
            "uptime": time.time() - performance_stats["start_time"],
        }


def reset_stats():
    """重置统计信息"""
    with stats_lock:
        performance_stats["requests"].clear()
        performance_stats["errors"].clear()
        performance_stats["total_requests"] = 0
        performance_stats["start_time"] = time.time()

        system_stats["cpu_usage"].clear()
        system_stats["memory_usage"].clear()
        system_stats["last_update"] = 0

    logger.info("性能统计已重置")
