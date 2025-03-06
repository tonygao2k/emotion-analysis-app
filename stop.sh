#!/bin/bash

# 情感分析应用停止脚本

echo "===== 停止情感分析应用 ====="

# 检查后端PID文件
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    echo "正在停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    rm backend.pid
    echo "后端服务已停止"
else
    echo "未找到后端服务PID文件"
fi

# 检查前端PID文件
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    echo "正在停止前端应用 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    rm frontend.pid
    echo "前端应用已停止"
else
    echo "未找到前端应用PID文件"
fi

# 尝试查找并杀死可能的进程
echo "尝试查找并停止可能运行的进程..."

# 查找并停止后端Flask进程
FLASK_PIDS=$(ps aux | grep "python app.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$FLASK_PIDS" ]; then
    echo "发现Flask进程: $FLASK_PIDS"
    kill $FLASK_PIDS 2>/dev/null
    echo "已停止Flask进程"
fi

# 查找并停止前端React进程
REACT_PIDS=$(ps aux | grep "react-scripts start" | grep -v grep | awk '{print $2}')
if [ ! -z "$REACT_PIDS" ]; then
    echo "发现React进程: $REACT_PIDS"
    kill $REACT_PIDS 2>/dev/null
    echo "已停止React进程"
fi

# 清理日志文件
if [ -f backend/backend.log ]; then
    echo "清理后端日志文件..."
    rm backend/backend.log
fi

if [ -f frontend/frontend.log ]; then
    echo "清理前端日志文件..."
    rm frontend/frontend.log
fi

echo "===== 情感分析应用已停止 ====="
