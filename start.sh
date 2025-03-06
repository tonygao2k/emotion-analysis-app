#!/bin/bash

# 情感分析应用启动脚本

echo "===== 启动情感分析应用 ====="

# 检查是否安装了必要的软件
if ! command -v python3 &> /dev/null; then
    echo "错误: 未安装Python3，请先安装Python3"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未安装npm，请先安装Node.js和npm"
    exit 1
fi

# 保存PID到文件
echo "" > backend.pid
echo "" > frontend.pid

# 启动后端
echo "正在启动后端服务..."
cd backend

# 使用Anaconda环境
echo "使用Anaconda环境..."
source /opt/anaconda3/etc/profile.d/conda.sh
conda activate AI

# 启动后端服务
echo "启动Flask服务..."
python app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
echo "后端服务已启动，PID: $BACKEND_PID"

cd ..

# 等待后端启动
echo "等待后端服务完全启动..."
sleep 5

# 启动Material UI前端
echo "正在启动Material UI前端应用..."
cd frontend-mui
npm install
PORT=3001 npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
echo "Material UI前端应用已启动，PID: $FRONTEND_PID"
cd ..

echo ""
echo "===== 情感分析应用已启动 ====="
echo "后端服务运行在: http://localhost:5001"
echo "前端应用运行在: http://localhost:3000"
echo ""
echo "请在浏览器中访问 http://localhost:3000 使用应用"
echo "按 Ctrl+C 停止所有服务"

# 记录PID以便后续关闭
echo "$BACKEND_PID" > backend.pid
echo "$FRONTEND_PID" > frontend.pid

# 等待用户按Ctrl+C
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm backend.pid frontend.pid 2>/dev/null; echo '服务已停止'; exit" INT
wait
