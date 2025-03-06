import React from 'react';
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

// 注册Chart.js组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ResultDisplay({ emotionResult, recognizedText }) {
  // 图表配置
  const chartData = {
    labels: ['非常消极', '消极', '中性', '积极', '非常积极'],
    datasets: [{
      label: '情感分数',
      data: emotionResult ? emotionResult.scores : [0, 0, 0, 0, 0],
      backgroundColor: [
        '#f44336', // 红色 - 非常消极
        '#ff9800', // 橙色 - 消极
        '#9e9e9e', // 灰色 - 中性
        '#4caf50', // 绿色 - 积极
        '#2196f3'  // 蓝色 - 非常积极
      ],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#ffffff'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: '情感分析分数分布',
        color: '#ffffff'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff'
      }
    }
  };

  // 获取情感图标
  const getEmotionIcon = (result) => {
    switch (result) {
      case '非常积极':
        return <SentimentVerySatisfiedIcon fontSize="large" sx={{ color: '#2196f3' }} />;
      case '积极':
        return <SentimentSatisfiedIcon fontSize="large" sx={{ color: '#4caf50' }} />;
      case '中性':
        return <SentimentNeutralIcon fontSize="large" sx={{ color: '#9e9e9e' }} />;
      case '消极':
        return <SentimentDissatisfiedIcon fontSize="large" sx={{ color: '#ff9800' }} />;
      case '非常消极':
        return <SentimentVeryDissatisfiedIcon fontSize="large" sx={{ color: '#f44336' }} />;
      default:
        return <SentimentNeutralIcon fontSize="large" />;
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, bgcolor: '#2d2d2d' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        分析结果
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              {getEmotionIcon(emotionResult.result)}
              <Typography variant="h4" component="span" sx={{ ml: 1 }}>
                {emotionResult.result}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8 }}>
              文本: "{recognizedText}"
            </Typography>
          </Box>
          
          <Box sx={{ height: 300 }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#2d2d2d' }}>
            <Typography variant="h6" gutterBottom>
              情感分析说明
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SentimentVeryDissatisfiedIcon sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText primary="非常消极" secondary="表达强烈的负面情绪" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SentimentDissatisfiedIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText primary="消极" secondary="表达一般的负面情绪" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SentimentNeutralIcon sx={{ color: '#9e9e9e' }} />
                </ListItemIcon>
                <ListItemText primary="中性" secondary="没有明显的情感倾向" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SentimentSatisfiedIcon sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText primary="积极" secondary="表达一般的正面情绪" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SentimentVerySatisfiedIcon sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText primary="非常积极" secondary="表达强烈的正面情绪" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default ResultDisplay;
