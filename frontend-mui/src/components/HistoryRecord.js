import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  IconButton, 
  Collapse, 
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

/**
 * 历史记录组件
 * 
 * @param {Array} historyData - 历史记录数据
 * @param {Function} onViewResult - 查看结果的回调函数
 * @param {Function} onClearHistory - 清除历史记录的回调函数
 * @returns {JSX.Element} 历史记录组件
 */
const HistoryRecord = ({ historyData = [], onViewResult, onClearHistory }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // 切换展开/折叠状态
  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // 获取情感图标
  const getEmotionIcon = (result) => {
    switch (result) {
      case '非常积极':
        return <SentimentVerySatisfiedIcon sx={{ color: '#64ffda' }} />;
      case '积极':
        return <SentimentSatisfiedIcon sx={{ color: '#03dac6' }} />;
      case '中性':
        return <SentimentNeutralIcon sx={{ color: '#9e9e9e' }} />;
      case '消极':
        return <SentimentDissatisfiedIcon sx={{ color: '#ffb74d' }} />;
      case '非常消极':
        return <SentimentVeryDissatisfiedIcon sx={{ color: '#cf6679' }} />;
      default:
        return <SentimentNeutralIcon sx={{ color: '#9e9e9e' }} />;
    }
  };
  
  // 获取情感颜色
  const getEmotionColor = (result) => {
    switch (result) {
      case '非常积极':
        return '#64ffda';
      case '积极':
        return '#03dac6';
      case '中性':
        return '#9e9e9e';
      case '消极':
        return '#ffb74d';
      case '非常消极':
        return '#cf6679';
      default:
        return '#9e9e9e';
    }
  };
  
  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return '未知时间';
    }
  };
  
  // 获取情感中文名称
  const getEmotionChineseName = (emotion) => {
    const emotionMap = {
      'angry': '愤怒',
      'disgust': '厌恶',
      'fear': '恐惧',
      'happy': '高兴',
      'sad': '悲伤',
      'surprise': '惊讶',
      'neutral': '平静'
    };
    
    return emotionMap[emotion] || '未知';
  };
  
  // 确认清除历史记录
  const handleClearHistory = () => {
    setConfirmDialogOpen(true);
  };
  
  // 确认清除
  const confirmClear = () => {
    onClearHistory();
    setConfirmDialogOpen(false);
  };
  
  // 取消清除
  const cancelClear = () => {
    setConfirmDialogOpen(false);
  };
  
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#03dac6', fontWeight: 500 }}>
          历史分析记录
        </Typography>
        {historyData.length > 0 && (
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={handleClearHistory}
            size="small"
          >
            清空历史
          </Button>
        )}
      </Box>
      
      {historyData.length === 0 ? (
        <Paper elevation={1} sx={{ p: 3, bgcolor: '#252525', textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            暂无历史记录
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: '#252525', borderRadius: 1 }}>
          {historyData.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider component="li" />}
              <ListItem 
                alignItems="flex-start"
                secondaryAction={
                  <Box>
                    <IconButton 
                      edge="end" 
                      aria-label="view" 
                      onClick={() => onViewResult(item)}
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon sx={{ color: '#03dac6' }} />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="expand"
                      onClick={() => toggleExpand(index)}
                    >
                      {expandedItems[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getEmotionIcon(item.result || item.combined_result)}
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          ml: 1, 
                          color: getEmotionColor(item.result || item.combined_result),
                          fontWeight: 500 
                        }}
                      >
                        {item.result || item.combined_result}
                      </Typography>
                      <Chip 
                        label={formatTimestamp(item.timestamp)} 
                        size="small" 
                        sx={{ ml: 2, bgcolor: 'rgba(3, 218, 198, 0.1)', color: '#b0bec5' }} 
                      />
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {item.video_emotion ? '视频分析' : '文本分析'}
                      </Typography>
                      
                      <Collapse in={expandedItems[index]} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2 }}>
                          {item.video_emotion && (
                            <Typography variant="body2" color="text.secondary" paragraph>
                              主要表情: 
                              <Chip 
                                label={getEmotionChineseName(item.video_emotion.details.dominant)} 
                                size="small" 
                                sx={{ 
                                  bgcolor: 'rgba(3, 218, 198, 0.1)', 
                                  color: '#03dac6',
                                  fontWeight: 'bold',
                                  ml: 1
                                }} 
                              />
                            </Typography>
                          )}
                          
                          {item.text_emotion && (
                            <Typography variant="body2" color="text.secondary" paragraph>
                              文本情感: 
                              <Chip 
                                label={item.text_emotion.result} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${getEmotionColor(item.text_emotion.result)}20`, 
                                  color: getEmotionColor(item.text_emotion.result),
                                  fontWeight: 'bold',
                                  ml: 1
                                }} 
                              />
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </React.Fragment>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
      
      {/* 确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={cancelClear}
      >
        <DialogTitle sx={{ color: '#cf6679' }}>
          确认清空历史记录
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            您确定要清空所有历史记录吗？此操作无法撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClear} color="primary">
            取消
          </Button>
          <Button onClick={confirmClear} color="error" variant="contained">
            确认清空
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryRecord;
