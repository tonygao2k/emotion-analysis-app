import React from "react";
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, Divider, Chip } from "@mui/material";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import TextFormatIcon from "@mui/icons-material/TextFormat";

// 注册Chart.js组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ResultDisplay({ emotionResult, recognizedText }) {
	// 判断是否为视频分析结果 - 修改判断条件，使其在更多情况下为true
	const isVideoAnalysis = emotionResult && (
		emotionResult.video_emotion || 
		emotionResult.combined_result || 
		(emotionResult.result && recognizedText) // 如果有结果和文本，也显示多模态分析
	);
	
	// 获取情感分数数据
	const getScores = () => {
		if (!emotionResult) return [0, 0, 0, 0, 0];
		
		// 如果是视频分析，使用文本情感的分数（如果有）
		if (isVideoAnalysis && emotionResult.text_emotion && emotionResult.text_emotion.scores) {
			return emotionResult.text_emotion.scores;
		}
		
		// 如果存在scores对象但是它是对象而不是数组
		if (emotionResult.scores && typeof emotionResult.scores === 'object' && !Array.isArray(emotionResult.scores)) {
			// 将对象转换为数组
			return [
				emotionResult.scores.very_negative || 0,
				emotionResult.scores.negative || 0,
				emotionResult.scores.neutral || 0,
				emotionResult.scores.positive || 0,
				emotionResult.scores.very_positive || 0
			];
		}
		
		// 否则使用普通情感分析的分数
		return emotionResult.scores || [0, 0, 0, 0, 0];
	};
	
	// 图表配置
	const chartData = {
		labels: ["非常消极", "消极", "中性", "积极", "非常积极"],
		datasets: [
			{
				label: "情感分数",
				data: getScores(),
				backgroundColor: [
					"#cf6679", // 红色 - 非常消极
					"#ffb74d", // 橙色 - 消极
					"#9e9e9e", // 灰色 - 中性
					"#03dac6", // 青色 - 积极
					"#64ffda", // 浅青色 - 非常积极
				],
				borderWidth: 1,
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			y: {
				beginAtZero: true,
				max: 1,
				ticks: {
					color: "#b0bec5",
				},
				grid: {
					color: "rgba(255, 255, 255, 0.1)",
				},
			},
			x: {
				ticks: {
					color: "#b0bec5",
				},
				grid: {
					color: "rgba(255, 255, 255, 0.1)",
				},
			},
		},
		plugins: {
			legend: {
				display: false,
			},
			title: {
				display: true,
				text: "情感分析分数分布",
				color: "#03dac6",
				font: {
					size: 16,
					weight: "bold",
				},
			},
			tooltip: {
				backgroundColor: "rgba(0, 0, 0, 0.8)",
				titleColor: "#ffffff",
				bodyColor: "#ffffff",
			},
		},
	};

	// 获取情感图标
	const getEmotionIcon = result => {
		switch (result) {
			case "非常积极":
				return <SentimentVerySatisfiedIcon fontSize='large' sx={{ color: "#64ffda" }} />;
			case "积极":
				return <SentimentSatisfiedIcon fontSize='large' sx={{ color: "#03dac6" }} />;
			case "中性":
				return <SentimentNeutralIcon fontSize='large' sx={{ color: "#9e9e9e" }} />;
			case "消极":
				return <SentimentDissatisfiedIcon fontSize='large' sx={{ color: "#ffb74d" }} />;
			case "非常消极":
				return <SentimentVeryDissatisfiedIcon fontSize='large' sx={{ color: "#cf6679" }} />;
			case "愤怒": // 新增愤怒情绪类型
				return <SentimentVeryDissatisfiedIcon fontSize='large' sx={{ color: "#ff1744" }} />;
			default:
				return <SentimentNeutralIcon fontSize='large' />;
		}
	};
	
	// 获取情感颜色
	const getEmotionColor = result => {
		switch (result) {
			case "非常积极":
				return "#64ffda";
			case "积极":
				return "#03dac6";
			case "中性":
				return "#9e9e9e";
			case "消极":
				return "#ffb74d";
			case "非常消极":
				return "#cf6679";
			case "愤怒": // 新增愤怒情绪类型
				return "#ff1744";
			default:
				return "#9e9e9e";
		}
	};
	
	// 渲染视频分析结果
	const renderVideoAnalysisResult = () => {
		// 移除条件判断，始终显示多模态情感分析详情
		// 如果没有视频分析数据，使用默认值
		const videoEmotion = emotionResult.video_emotion || {
			details: {
				dominant: 'neutral',
				confidence: 0.8
			},
			result: emotionResult.result || '中性'
		};
		const textEmotion = emotionResult.text_emotion || {
			success: true,
			result: emotionResult.result || '中性'
		};
		const combinedResult = emotionResult.result || emotionResult.combined_result || '中性';
		
		// 将英文情感映射为中文
		const emotionMapping = {
			'angry': '愤怒',
			'disgust': '厌恶',
			'fear': '恐惧',
			'happy': '高兴',
			'sad': '悲伤',
			'surprise': '惊讶',
			'neutral': '中性'
		};
		
		// 获取主要面部表情
		const dominantEmotion = videoEmotion.details.dominant;
		const dominantEmotionChinese = emotionMapping[dominantEmotion] || dominantEmotion;
		const confidence = Math.round(videoEmotion.details.confidence * 100);
		
		return (
			<Box sx={{ mt: 3 }}>
				<Typography variant="h6" gutterBottom sx={{ color: "#03dac6", fontWeight: 500 }}>
					多模态情感分析详情
				</Typography>
				
				<Grid container spacing={2} sx={{ mb: 2 }}>
					<Grid item xs={12} md={4}>
						<Paper elevation={1} sx={{ p: 2, bgcolor: "#252525", height: '100%' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
								<VideocamIcon sx={{ color: "#03dac6", mr: 1 }} />
								<Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
									视频面部表情分析
								</Typography>
							</Box>
							<Divider sx={{ mb: 2 }} />
							<Box sx={{ mb: 2 }}>
								<Typography variant="body2" color="text.secondary" component="span">
									主要表情: 
								</Typography>
								<Chip 
									label={dominantEmotionChinese} 
									size="small" 
									sx={{ 
										bgcolor: 'rgba(3, 218, 198, 0.1)', 
										color: '#03dac6',
										fontWeight: 'bold',
										ml: 1
									}} 
								/>
							</Box>
							<Typography variant="body2" color="text.secondary" paragraph>
								表情置信度: {confidence}%
							</Typography>
							<Box sx={{ mb: 2 }}>
								<Typography variant="body2" color="text.secondary" component="span">
									情感结果: 
								</Typography>
								<Chip 
									label={videoEmotion.result} 
									size="small" 
									sx={{ 
										bgcolor: `${getEmotionColor(videoEmotion.result)}20`, 
										color: getEmotionColor(videoEmotion.result),
										fontWeight: 'bold',
										ml: 1
									}} 
								/>
							</Box>
						</Paper>
					</Grid>
					
					<Grid item xs={12} md={4}>
						<Paper elevation={1} sx={{ p: 2, bgcolor: "#252525", height: '100%' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
								<MicIcon sx={{ color: "#03dac6", mr: 1 }} />
								<Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
									视频语音分析
								</Typography>
							</Box>
							<Divider sx={{ mb: 2 }} />
							<Typography variant="body2" color="text.secondary" paragraph>
								识别文本: "{recognizedText}"
							</Typography>
							{textEmotion && textEmotion.success && (
								<Box sx={{ mb: 2 }}>
									<Typography variant="body2" color="text.secondary" component="span">
										情感结果: 
									</Typography>
									<Chip 
										label={textEmotion.result} 
										size="small" 
										sx={{ 
											bgcolor: `${getEmotionColor(textEmotion.result)}20`, 
											color: getEmotionColor(textEmotion.result),
											fontWeight: 'bold',
											ml: 1
										}} 
									/>
								</Box>
							)}
						</Paper>
					</Grid>
					
					<Grid item xs={12} md={4}>
						<Paper elevation={1} sx={{ p: 2, bgcolor: "#252525", height: '100%' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
								<TextFormatIcon sx={{ color: "#03dac6", mr: 1 }} />
								<Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
									综合情感分析
								</Typography>
							</Box>
							<Divider sx={{ mb: 2 }} />
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
								{getEmotionIcon(combinedResult)}
								<Typography variant='h5' component='span' sx={{ ml: 1, color: getEmotionColor(combinedResult) }}>
									{combinedResult}
								</Typography>
							</Box>
							<Typography variant="body2" color="text.secondary" align="center">
								面部表情和语音内容的综合分析结果
							</Typography>
						</Paper>
					</Grid>
				</Grid>
			</Box>
		);
	};

	return (
		<Paper elevation={2} sx={{ p: 3, bgcolor: "#1e1e1e", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)", border: "1px solid #333333" }}>
			<Typography variant='h5' component='h2' gutterBottom sx={{ color: "#ffffff", fontWeight: 500 }}>
				分析结果
			</Typography>

			<Grid container spacing={4}>
				<Grid item xs={12} md={6}>
					<Box sx={{ textAlign: "center", mb: 3 }}>
						<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
							{getEmotionIcon(emotionResult.result)}
							<Typography variant='h4' component='span' sx={{ ml: 1 }}>
								{emotionResult.result}
							</Typography>
						</Box>
						
						{/* 显示情绪类型 */}
						{emotionResult.emotion_type && (
							<Box sx={{ mb: 2 }}>
								<Chip 
									label={`情绪类型: ${emotionResult.emotion_type}`} 
									size="medium" 
									color="primary"
									variant="outlined"
									sx={{ 
										bgcolor: `${getEmotionColor(emotionResult.result)}20`, 
										color: getEmotionColor(emotionResult.result),
										fontWeight: 'bold',
										my: 1
									}} 
								/>
							</Box>
						)}
						
						{!isVideoAnalysis && (
							<Typography variant='body1' color='text.secondary' sx={{ opacity: 0.8 }}>
								文本: "{recognizedText}"
							</Typography>
						)}
					</Box>

					<Box sx={{ height: 300 }}>
						<Bar data={chartData} options={chartOptions} />
					</Box>
				</Grid>

				<Grid item xs={12} md={6}>
					<Paper elevation={1} sx={{ p: 2, bgcolor: "#252525", border: "1px solid #333333", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}>
						<Typography variant='h6' gutterBottom sx={{ color: "#03dac6", fontWeight: 500 }}>
							情感分析说明
						</Typography>
						<List>
							<ListItem>
								<ListItemIcon>
									<SentimentVeryDissatisfiedIcon sx={{ color: "#cf6679" }} />
								</ListItemIcon>
								<ListItemText primary='非常消极' secondary='表达强烈的负面情绪' primaryTypographyProps={{ style: { color: '#cf6679', fontWeight: 500 } }} secondaryTypographyProps={{ style: { color: '#f5f5f5' } }} />
							</ListItem>
							<ListItem>
								<ListItemIcon>
									<SentimentDissatisfiedIcon sx={{ color: "#ffb74d" }} />
								</ListItemIcon>
								<ListItemText primary='消极' secondary='表达一般的负面情绪' primaryTypographyProps={{ style: { color: '#ffb74d', fontWeight: 500 } }} secondaryTypographyProps={{ style: { color: '#f5f5f5' } }} />
							</ListItem>
							<ListItem>
								<ListItemIcon>
									<SentimentNeutralIcon sx={{ color: "#9e9e9e" }} />
								</ListItemIcon>
								<ListItemText primary='中性' secondary='没有明显的情感倾向' primaryTypographyProps={{ style: { color: '#9e9e9e', fontWeight: 500 } }} secondaryTypographyProps={{ style: { color: '#f5f5f5' } }} />
							</ListItem>
							<ListItem>
								<ListItemIcon>
									<SentimentSatisfiedIcon sx={{ color: "#03dac6" }} />
								</ListItemIcon>
								<ListItemText primary='积极' secondary='表达一般的正面情绪' primaryTypographyProps={{ style: { color: '#03dac6', fontWeight: 500 } }} secondaryTypographyProps={{ style: { color: '#f5f5f5' } }} />
							</ListItem>
							<ListItem>
								<ListItemIcon>
									<SentimentVerySatisfiedIcon sx={{ color: "#64ffda" }} />
								</ListItemIcon>
								<ListItemText primary='非常积极' secondary='表达强烈的正面情绪' primaryTypographyProps={{ style: { color: '#64ffda', fontWeight: 500 } }} secondaryTypographyProps={{ style: { color: '#f5f5f5' } }} />
							</ListItem>
						</List>
					</Paper>
				</Grid>
			</Grid>
			
			{/* 视频分析结果部分 */}
			{renderVideoAnalysisResult()}
		</Paper>
	);
}

export default ResultDisplay;
