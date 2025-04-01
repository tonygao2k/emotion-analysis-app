import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Paper, Alert } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * 视频上传和分析组件
 * 
 * @param {string} apiBaseUrl - API基础URL
 * @param {function} setResult - 设置分析结果的函数
 * @param {boolean} modelLoaded - 模型是否已加载
 * @param {function} setError - 设置错误信息的函数
 * @returns {JSX.Element} 视频上传和分析组件
 */
const VideoInput = ({ apiBaseUrl, setResult, modelLoaded, setError }) => {
  // 初始化状态变量
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [progress, setProgress] = useState(0);

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

  /**
   * 处理视频上传和分析
   */
  const handleUpload = async () => {
    if (!videoFile) {
      setError('请先选择视频文件');
      return;
    }

    if (!modelLoaded) {
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
            if (data.success) {
              setResult(data);
              console.log('视频分析成功:', data);
            } else {
              const errorMsg = data.error || '视频分析失败';
              console.error('视频分析失败:', errorMsg);
              setError(errorMsg);
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
          setUploading(false);
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
          <Box sx={{ width: '100%', maxWidth: 500, mb: 2 }}>
            <Typography variant="body2" color="textSecondary" align="center">
              上传进度: {progress}%
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 10,
                bgcolor: '#e0e0e0',
                borderRadius: 5,
                mt: 1,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  width: `${progress}%`,
                  height: '100%',
                  bgcolor: 'primary.main',
                  borderRadius: 5,
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
              {progress < 100 ? '上传中...' : '分析中...'}
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          disabled={!videoFile || uploading || !modelLoaded}
          onClick={handleUpload}
          sx={{ mt: 2 }}
        >
          {uploading ? '处理中...' : '上传并分析'}
        </Button>
        
        {!modelLoaded && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            模型尚未加载完成，请稍候...
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default VideoInput;
