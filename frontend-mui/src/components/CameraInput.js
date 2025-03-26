import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert, CircularProgress, Chip, Stack } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import StopIcon from '@mui/icons-material/Stop';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';

/**
 * 摄像头实时情感分析组件
 * 
 * @param {string} apiBaseUrl - API基础URL
 * @param {function} setResult - 设置分析结果的函数
 * @param {boolean} modelLoaded - 模型是否已加载
 * @param {function} setError - 设置错误信息的函数
 * @returns {JSX.Element} 摄像头实时情感分析组件
 */
const CameraInput = ({ apiBaseUrl, setResult, modelLoaded, setError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [apiStatus, setApiStatus] = useState('未连接'); // 新增：API连接状态
  const [modelStatus, setModelStatus] = useState(modelLoaded ? '已加载' : '加载中'); // 新增：模型状态
  const [networkLatency, setNetworkLatency] = useState(0); // 新增：网络延迟
  const [processingStats, setProcessingStats] = useState({ // 新增：处理统计信息
    totalFrames: 0,
    successFrames: 0,
    failedFrames: 0,
    averageProcessTime: 0
  });
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // 启动摄像头
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // 检查API连接状态
      try {
        setApiStatus('检查中...');
        const startTime = Date.now();
        const response = await fetch(`${apiBaseUrl}/status`);
        const endTime = Date.now();
        setNetworkLatency(endTime - startTime);
        
        if (response.ok) {
          const statusData = await response.json();
          setApiStatus('已连接');
          
          // 更新模型状态信息
          if (statusData.loaded) {
            setModelStatus('已加载');
          } else {
            setModelStatus('加载中');
          }
          
          // 记录详细的模型信息到控制台
          console.log('模型状态信息:', statusData);
        } else {
          setApiStatus('连接异常');
        }
      } catch (error) {
        console.error('API连接检查失败:', error);
        setApiStatus('连接失败');
      }
      
      // 启动摄像头
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsRecording(true);
        startAnalysis();
      }
    } catch (err) {
      console.error('摄像头访问错误:', err);
      setCameraError(`无法访问摄像头: ${err.message}`);
    }
  };
  
  // 停止摄像头
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsRecording(false);
    
    // 分析结果
    if (emotionHistory.length > 0) {
      // 计算主要情绪
      const emotionCounts = emotionHistory.reduce((acc, emotion) => {
        acc[emotion.dominant] = (acc[emotion.dominant] || 0) + 1;
        return acc;
      }, {});
      
      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
        emotionCounts[a] > emotionCounts[b] ? a : b, Object.keys(emotionCounts)[0]);
      
      // 计算平均情绪值
      const emotionAvg = {};
      const emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral'];
      
      emotions.forEach(emotion => {
        const values = emotionHistory
          .map(e => e.all_emotions[emotion])
          .filter(v => v !== undefined);
        
        emotionAvg[emotion] = values.length > 0 
          ? values.reduce((sum, val) => sum + val, 0) / values.length 
          : 0;
      });
      
      // 映射到我们的情感分类
      const emotionMapping = {
        'angry': '消极',
        'disgust': '消极',
        'fear': '消极',
        'sad': '消极',
        'happy': '积极',
        'surprise': '中性',
        'neutral': '中性'
      };
      
      const mappedEmotion = emotionMapping[dominantEmotion] || '中性';
      
      // 设置最终结果
      setResult({
        success: true,
        video_emotion: {
          result: mappedEmotion,
          confidence: emotionAvg[dominantEmotion] || 0,
          details: {
            dominant: dominantEmotion,
            all_emotions: emotionAvg
          }
        },
        combined_result: mappedEmotion
      });
    }
  };
  
  // 开始分析
  const startAnalysis = () => {
    if (!modelLoaded) {
      setError('模型尚未加载完成，请稍后再试');
      stopCamera();
      return;
    }
    
    // 清空历史记录
    setEmotionHistory([]);
    
    // 设置定时器，每秒分析一次
    timerRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 1000);
    
    // 开始渲染人脸框
    renderLoop();
  };
  
  // 渲染循环
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current || !isRecording) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // 绘制视频
    ctx.drawImage(
      videoRef.current, 
      0, 0, 
      canvasRef.current.width, 
      canvasRef.current.height
    );
    
    // 如果有当前情绪，绘制人脸框和情绪标签
    if (currentEmotion && currentEmotion.face_box) {
      const { face_box, dominant, confidence } = currentEmotion;
      const [x, y, width, height] = face_box;
      
      // 绘制人脸框
      ctx.strokeStyle = '#03dac6'; // 使用应用的主题色
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // 绘制情绪标签
      ctx.fillStyle = 'rgba(3, 218, 198, 0.7)';
      ctx.fillRect(x, y - 30, width, 30);
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.fillText(
        `${dominant} (${Math.round(confidence * 100)}%)`, 
        x + 5, 
        y - 10
      );
    }
    
    // 继续渲染循环
    animationFrameRef.current = requestAnimationFrame(renderLoop);
  };
  
  // 捕获并分析当前帧
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isRecording || analyzing) return;
    
    try {
      setAnalyzing(true);
      
      // 捕获当前帧
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      // 转换为base64
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      // 发送到后端分析
      const startTime = Date.now();
      const response = await fetch(`${apiBaseUrl}/analyze_frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: dataUrl
        }),
      });
      
      const endTime = Date.now();
      setNetworkLatency(endTime - startTime);
      setApiStatus('已连接');
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentEmotion(result.emotion);
        // 添加到历史记录
        setEmotionHistory(prev => [...prev, result.emotion]);
        
        // 获取处理信息
        const processTime = result.processing_info?.total_time_ms || (endTime - startTime);
        
        // 更新处理统计信息
        setProcessingStats(prev => ({
          totalFrames: prev.totalFrames + 1,
          successFrames: prev.successFrames + 1,
          failedFrames: prev.failedFrames,
          averageProcessTime: (prev.averageProcessTime * prev.totalFrames + processTime) / (prev.totalFrames + 1)
        }));
      } else {
        // 如果没有检测到人脸，清除当前情绪
        setCurrentEmotion(null);
        
        // 更新处理统计信息
        setProcessingStats(prev => ({
          totalFrames: prev.totalFrames + 1,
          successFrames: prev.successFrames,
          failedFrames: prev.failedFrames + 1,
          averageProcessTime: (prev.averageProcessTime * prev.totalFrames) / (prev.totalFrames + 1)
        }));
      }
    } catch (error) {
      console.error('分析帧时出错:', error);
      setApiStatus('连接异常');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // 清理资源
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // 渲染情绪图标
  const renderEmotionIcon = () => {
    if (!currentEmotion) return null;
    
    const { mapped } = currentEmotion;
    
    switch (mapped) {
      case '积极':
        return <SentimentSatisfiedAltIcon sx={{ color: '#03dac6', fontSize: 40 }} />;
      case '消极':
        return <SentimentVeryDissatisfiedIcon sx={{ color: '#cf6679', fontSize: 40 }} />;
      default:
        return <SentimentNeutralIcon sx={{ color: '#64ffda', fontSize: 40 }} />;
    }
  };
  
  // 获取状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case '已连接':
      case '已加载':
        return 'success';
      case '检查中...':
      case '加载中':
        return 'info';
      case '连接异常':
      case '连接失败':
        return 'error';
      default:
        return 'default';
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        通过摄像头实时分析情感
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        使用摄像头实时捕捉面部表情，系统将分析您的情绪状态并提供实时反馈。
      </Typography>
      
      {cameraError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {cameraError}
        </Alert>
      )}
      
      <Alert severity="info" sx={{ mb: 2 }}>
        请确保光线充足，面部清晰可见，以获得最佳分析效果。
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button
          variant="contained"
          color={isRecording ? "error" : "primary"}
          startIcon={isRecording ? <StopIcon /> : <VideocamIcon />}
          onClick={isRecording ? stopCamera : startCamera}
          disabled={!modelLoaded}
          sx={{ mr: 2 }}
        >
          {isRecording ? '停止分析' : '开始摄像头分析'}
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%', 
            maxWidth: 640, 
            height: 'auto', 
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2
          }}
        >
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              width: '100%', 
              height: 'auto',
              display: isRecording ? 'none' : 'block'
            }}
          />
          <canvas 
            ref={canvasRef}
            width={640}
            height={480}
            style={{ 
              width: '100%', 
              height: 'auto',
              display: isRecording ? 'block' : 'none'
            }}
          />
          
          {analyzing && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                bgcolor: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                p: 1
              }}
            >
              <CircularProgress size={20} color="primary" />
            </Box>
          )}
          
          {currentEmotion && (
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0,
                bgcolor: 'rgba(0,0,0,0.7)',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
              }}
            >
              {renderEmotionIcon()}
              <Typography variant="h6" color="white">
                检测到的情绪: {currentEmotion.dominant} 
                ({Math.round(currentEmotion.confidence * 100)}%)
              </Typography>
            </Box>
          )}
          
          {!isRecording && !videoRef.current?.srcObject && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.1)',
                flexDirection: 'column'
              }}
            >
              <VideocamIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                点击"开始摄像头分析"按钮启动摄像头
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
      
      {emotionHistory.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            已分析 {emotionHistory.length} 帧
          </Typography>
        </Box>
      )}
      
      <Paper elevation={2} sx={{ mt: 3, p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
          系统状态信息
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label={`模型状态：${modelStatus}`} 
            color={getStatusColor(modelStatus)} 
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip 
            label={`API状态：${apiStatus}`} 
            color={getStatusColor(apiStatus)} 
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip 
            label={`网络延迟：${networkLatency}ms`} 
            color={networkLatency < 100 ? 'success' : networkLatency < 300 ? 'warning' : 'error'} 
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        </Stack>
        
        <Typography variant="subtitle2" gutterBottom>
          处理统计信息
        </Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">总处理帧数：</Typography>
            <Typography variant="body2" fontWeight="bold">{processingStats.totalFrames}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">成功识别帧数：</Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">{processingStats.successFrames}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">失败帧数：</Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">{processingStats.failedFrames}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">平均处理时间：</Typography>
            <Typography variant="body2" fontWeight="bold">{processingStats.averageProcessTime.toFixed(2)}ms</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">成功率：</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary.main">
              {processingStats.totalFrames > 0 
                ? `${((processingStats.successFrames / processingStats.totalFrames) * 100).toFixed(1)}%` 
                : '0%'}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CameraInput;
