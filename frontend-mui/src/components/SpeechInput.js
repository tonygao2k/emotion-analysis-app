import React, { useState, useRef } from 'react';
import { 
  Box, Grid, Button, TextField, LinearProgress, 
  FormControl, InputLabel, Select, MenuItem, 
  Typography, Paper, Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// 定义录音动画组件
const RecordingAnimation = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  '& .bar': {
    display: 'inline-block',
    width: '4px',
    height: '16px',
    margin: '0 2px',
    backgroundColor: theme.palette.primary.main,
    animation: 'recording-animation 1.2s infinite ease-in-out',
    animationDelay: props => `${props.delay}s`,
  }
}));

function SpeechInput({ modelLoaded, apiBaseUrl, onRecognitionResult, recognizedText, setError }) {
  // 状态变量
  const [language, setLanguage] = useState('zh-CN');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('准备就绪');
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // 开始/停止录音
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startRecording(stream);
        setIsRecording(true);
        setStatus('正在录音...');
      } catch (err) {
        console.error('获取麦克风权限失败:', err);
        setError('无法访问麦克风，请确保已授予权限。');
      }
    } else {
      stopRecording();
      setIsRecording(false);
      setStatus('处理中...');
      setShowProgress(true);
      setProgress(10);
    }
  };

  // 开始录音
  const startRecording = (stream) => {
    audioChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.addEventListener('dataavailable', event => {
      audioChunksRef.current.push(event.data);
    });

    mediaRecorderRef.current.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      processAudioBlob(audioBlob);
    });

    mediaRecorderRef.current.start();
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // 处理录音数据
  const processAudioBlob = async (audioBlob) => {
    setProgress(30);

    try {
      // 转换为Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async function() {
        const base64data = reader.result;
        
        setProgress(50);
        
        try {
          // 发送到服务器
          const response = await fetch(`${apiBaseUrl}/record`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio: base64data,
              language: language
            }),
          });
          
          const data = await response.json();
          setProgress(90);
          onRecognitionResult(data);
          setProgress(100);
          
          setTimeout(() => {
            setShowProgress(false);
            setProgress(0);
          }, 500);
        } catch (error) {
          console.error('处理录音出错:', error);
          setStatus('处理出错');
          setShowProgress(false);
          setError('处理录音时出错，请重试。');
        }
      };
    } catch (error) {
      console.error('处理录音出错:', error);
      setStatus('处理出错');
      setShowProgress(false);
      setError('处理录音时出错，请重试。');
    }
  };

  // 上传音频文件
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setStatus('处理音频文件...');
      setShowProgress(true);
      setProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);
      
      fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        body: formData,
      })
        .then(response => response.json())
        .then(data => {
          setProgress(90);
          onRecognitionResult(data);
          setProgress(100);
          
          setTimeout(() => {
            setShowProgress(false);
            setProgress(0);
          }, 500);
        })
        .catch(error => {
          console.error('处理音频文件出错:', error);
          setStatus('处理出错');
          setShowProgress(false);
          setError('处理音频文件时出错，请重试。');
        });
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="language-select-label">选择语言</InputLabel>
            <Select
              labelId="language-select-label"
              id="language-select"
              value={language}
              label="选择语言"
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isRecording}
            >
              <MenuItem value="zh-CN">中文</MenuItem>
              <MenuItem value="en-US">英文</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant={isRecording ? "contained" : "outlined"}
              color={isRecording ? "secondary" : "primary"}
              onClick={toggleRecording}
              disabled={!modelLoaded}
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              sx={{ flexGrow: 1 }}
            >
              {isRecording ? '停止录音' : '开始录音'}
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={() => fileInputRef.current.click()}
              disabled={!modelLoaded || isRecording}
              startIcon={<UploadFileIcon />}
              sx={{ flexGrow: 1 }}
            >
              上传音频文件
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".wav,.mp3,.flac"
              style={{ display: 'none' }}
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, height: '100%', bgcolor: '#2d2d2d' }}>
            <Typography variant="subtitle1" gutterBottom>
              {status}
            </Typography>
            
            {showProgress && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            )}
            
            {isRecording && (
              <RecordingAnimation>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bar" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </RecordingAnimation>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="识别结果"
            multiline
            rows={4}
            value={recognizedText}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'text.secondary',
              },
              '& .MuiInputBase-input': {
                color: 'text.primary',
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default SpeechInput;
