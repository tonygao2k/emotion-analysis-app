import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Typography, Paper, Alert, LinearProgress } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * 视频上传和分析组件
 * 
 * @param {string} apiBaseUrl - API基础URL
 * @param {function} setResult - 设置分析结果的函数
 * @param {string} modelStatus - 模型加载状态 ('idle', 'loading', 'retrying', 'loaded', 'failed')
 * @param {function} setError - 设置错误信息的函数
 * @returns {JSX.Element} 视频上传和分析组件
 */
const VideoInput = ({ apiBaseUrl, setResult, modelStatus, setError }) => {
  // 初始化状态变量
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState(null); // 新增：存储任务ID
  const [pollingIntervalId, setPollingIntervalId] = useState(null); // 新增：存储轮询定时器ID
  const [analysisStatus, setAnalysisStatus] = useState("idle"); // 新增：跟踪分析状态 (idle, processing, completed, failed)
  const [videoFile, setVideoFile] = useState(null);

  // 清理函数，确保组件卸载时停止轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  /**
   * 处理文件选择事件
   * @param {Event} event - 文件选择事件
   */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 检查文件类型
      const fileType = file.type;
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      
      if (!validTypes.includes(fileType)) {
        setError(`不支持的文件类型: ${fileType}。请上传MP4、MOV、AVI或MKV格式的视频。`);
        return;
      }
      
      // 检查文件大小
      const maxSize = 32 * 1024 * 1024; // 32MB
      if (file.size > maxSize) {
        setError(`文件过大，最大允许32MB。当前文件大小: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }
      
      setVideoFile(file);
      // 清除之前的错误
      setError(null);
    }
  };

  // --- 新增：轮询任务状态函数 ---
  const pollTaskStatus = useCallback(async (currentTaskId) => {
    if (!currentTaskId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/task_status/${currentTaskId}`);
      const data = await response.json();

      if (data.success) {
        setAnalysisStatus(data.status); // 更新分析状态

        if (data.status === "completed") {
          setResult(data.result); // 假设结果在 result 中
          setError(null);
          setUploading(false);
          setProgress(100);
          setTaskId(null); // 清除任务ID
          if (pollingIntervalId) clearInterval(pollingIntervalId); // 停止轮询
          setPollingIntervalId(null);
        } else if (data.status === "failed") {
          setError(`视频分析失败: ${data.error}`);
          setResult(null);
          setUploading(false);
          setTaskId(null);
          if (pollingIntervalId) clearInterval(pollingIntervalId);
          setPollingIntervalId(null);
        } else {
          // 状态仍然是 processing 或其他，继续轮询
          // 可以在这里更新更详细的进度信息，如果后端提供的话
          console.log(`任务 ${currentTaskId} 状态: ${data.status}`);
        }
      } else {
        // 获取状态失败，可能是临时网络问题或任务ID无效
        console.warn(`无法获取任务 ${currentTaskId} 的状态: ${data.error}`);
        // 可以选择在这里实现一些重试逻辑或停止轮询
        // setError(`无法获取分析状态，请稍后重试`);
        // setUploading(false);
        // setTaskId(null);
        // if (pollingIntervalId) clearInterval(pollingIntervalId);
        // setPollingIntervalId(null);
      }
    } catch (error) {
      console.error("轮询任务状态时出错:", error);
      setError("轮询任务状态时发生网络错误");
      setUploading(false);
      setTaskId(null);
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [apiBaseUrl, setResult, setError, pollingIntervalId]); // 添加依赖
  // -------------------------

  /**
   * 处理视频上传和分析
   */
  const handleUpload = async () => {
    if (!videoFile) {
      setError('请先选择视频文件');
      return;
    }

    if (modelStatus !== 'loaded') {
      setError('模型尚未加载完成，请稍后再试');
      return;
    }

    setUploading(true);
    setProgress(0);
    
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('language', 'zh-CN');

    try {
      // 使用XMLHttpRequest来监控上传进度
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      });
      
      xhr.onload = () => {
        try {
          // 尝试解析响应
          const response = xhr.responseText;
          console.log('服务器响应:', response);
          
          if (xhr.status === 200) {
            const data = JSON.parse(response);
            if (data.success && data.task_id) {
              setTaskId(data.task_id); // 存储 Task ID
              setAnalysisStatus("processing"); // 设置状态为处理中
              setError(null);
              // 清除旧的轮询（如果有）
              if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
              }
              // 开始轮询新的 Task ID
              const intervalId = setInterval(() => pollTaskStatus(data.task_id), 3000); // 每3秒轮询一次
              setPollingIntervalId(intervalId);

              // 进度条可以先显示上传完成
              setProgress(100);
              // 注意：setUploading 保持 true，直到轮询结束
              // setUploading(false); // 不在这里设置 false
            } else {
              // 上传请求本身失败或未返回 task_id
              setError(data.error || "启动视频分析失败");
              setResult(null);
              setUploading(false);
              setTaskId(null);
              setAnalysisStatus("idle");
            }
          } else {
            // 非200状态码
            console.error(`服务器错误: ${xhr.status}`, response);
            try {
              // 尝试解析错误响应
              const errorData = JSON.parse(response);
              setError(errorData.error || `服务器错误: ${xhr.status}`);
            } catch (e) {
              // 无法解析JSON
              setError(`服务器错误: ${xhr.status}，请检查网络连接或稍后再试`);
            }
          }
        } catch (e) {
          console.error('处理服务器响应时出错:', e);
          setError('处理服务器响应时出错，请稍后再试');
        } finally {
          // setUploading(false);
        }
      };
      
      xhr.onerror = () => {
        setError('上传视频时出错，请重试');
        setUploading(false);
      };
      
      xhr.open('POST', `${apiBaseUrl}/upload_video`, true);
      xhr.send(formData);
    } catch (error) {
      console.error('上传视频出错:', error);
      setError('上传视频时出错，请重试');
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        通过视频分析情感
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        上传一段包含面部表情的视频，系统将分析视频中的面部表情和语音内容，综合判断情感倾向。
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        支持的视频格式: MP4, AVI, MOV, MKV。视频应包含清晰的人脸和语音以获得最佳分析结果。
      </Alert>

      <Box sx={{ my: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          accept="video/mp4,video/avi,video/mov,video/mkv"
          id="video-upload"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <label htmlFor="video-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<VideocamIcon />}
            sx={{ mb: 2 }}
            disabled={uploading}
          >
            选择视频文件
          </Button>
        </label>

        {videoFile && (
          <Paper elevation={3} sx={{ p: 2, mb: 3, width: '100%', maxWidth: 500, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                已选择视频文件
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VideocamIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  文件名: {videoFile.name}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                格式: {videoFile.type.split('/')[1].toUpperCase()}
              </Typography>
            </Box>
            
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center' }}>
              点击下方按钮上传并分析视频
            </Typography>
          </Paper>
        )}

        {uploading && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress variant='determinate' value={progress} />
            <Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
              {/* 根据分析状态显示不同文本 */}
              {analysisStatus === 'processing' && taskId ? '视频处理中...' :
                analysisStatus === 'completed' ? '分析完成！' :
                analysisStatus === 'failed' ? '分析失败' :
                `${Math.round(progress)}% 上传完成...`}
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          disabled={!videoFile || uploading || modelStatus !== 'loaded'}
          onClick={handleUpload}
          sx={{ mt: 2 }}
        >
          {/* 按钮文本也根据状态变化 */}
          {taskId && analysisStatus === 'processing' ? '正在分析...' : '开始分析'}
        </Button>
        
        {modelStatus !== 'loaded' && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            模型尚未加载完成，请稍候...
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default VideoInput;
