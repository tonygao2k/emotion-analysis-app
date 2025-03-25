import React from "react";
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";

// 注册Chart.js组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ResultDisplay({ emotionResult, recognizedText }) {
	// 图表配置
	const chartData = {
		labels: ["非常消极", "消极", "中性", "积极", "非常积极"],
		datasets: [
			{
				label: "情感分数",
				data: emotionResult ? emotionResult.scores : [0, 0, 0, 0, 0],
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
			default:
				return <SentimentNeutralIcon fontSize='large' />;
		}
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
						<Typography variant='body1' color='text.secondary' sx={{ opacity: 0.8 }}>
							文本: "{recognizedText}"
						</Typography>
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
		</Paper>
	);
}

export default ResultDisplay;
