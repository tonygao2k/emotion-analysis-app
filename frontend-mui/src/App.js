import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import "./App.css";

// 导入组件
import EmotionTabs from "./components/EmotionTabs";

// 创建现代风格的暗色主题
const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#03dac6", // 青色
			light: "#64ffda",
			dark: "#00a896",
		},
		secondary: {
			main: "#64ffda", // 浅青色
			light: "#9effff",
			dark: "#14b5a9",
		},
		background: {
			default: "#121212", // 深灰色背景
			paper: "#1e1e1e", // 略浅的深灰色
		},
		text: {
			primary: "#ffffff", // 白色文字
			secondary: "#b0bec5", // 浅灰色文字
		},
		error: {
			main: "#cf6679",
			light: "#ff95a2",
		},
		warning: {
			main: "#ffb74d",
			light: "#ffe97d",
		},
		success: {
			main: "#4caf50",
			light: "#80e27e",
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
		h1: {
			fontSize: "2.5rem",
			fontWeight: 500,
			color: "#03dac6", // 青色标题
		},
		h5: {
			fontWeight: 500,
			color: "#b0bec5", // 浅灰色副标题
		},
	},
	components: {
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundColor: "#1e1e1e",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)", // 黑色阴影
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
				},
			},
		},
	},
});

// 从环境变量获取API基础URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8080/api";

function App() {
	// 状态变量
	const [modelLoaded, setModelLoaded] = useState(false);
	const [modelLoading, setModelLoading] = useState(false);
	const [error, setError] = useState(null);

	// 检查模型加载状态
	useEffect(() => {
		// 模型加载超时处理
		let loadingTimeoutId = null;
		
		const checkModelStatus = async () => {
			try {
				console.log("正在检查模型加载状态...");
				const response = await fetch(`${API_BASE_URL}/status`);
				const data = await response.json();
				console.log("模型状态响应:", data);

				// 清除之前的超时定时器
				if (loadingTimeoutId) {
					clearTimeout(loadingTimeoutId);
					loadingTimeoutId = null;
				}

				// 检查嵌套的status对象
				if (data.status && data.status.loaded) {
					console.log("模型已加载完成");
					setModelLoaded(true);
					setModelLoading(false);
					setError(null); // 清除之前的错误
				} else if (data.status && data.status.loading) {
					console.log("模型正在加载中...");
					setModelLoaded(false);
					setModelLoading(true);
					
					// 设置加载超时定时器，60秒后显示超时提示
					loadingTimeoutId = setTimeout(() => {
						setError("模型加载时间过长，可能是第一次加载或服务器资源不足");
						setModelLoading(false);
					}, 60000);
					
					setTimeout(checkModelStatus, 2000);
				} else {
					console.log("模型未加载，将在2秒后重试");
					setModelLoaded(false);
					setModelLoading(false);
					setTimeout(checkModelStatus, 2000);
				}
			} catch (error) {
				console.error("获取模型状态出错:", error);
				// 尝试使用更可靠的方式检查服务器连接
				try {
					// 直接检查服务器是否可访问
					await fetch(`${API_BASE_URL}/ping`, { method: "GET", timeout: 2000 })
						.then(response => {
							if (response.ok) {
								console.log("服务器可访问，但模型状态请求失败");
								setError("服务器可访问，但模型状态请求失败，将重试");
							}
						})
						.catch(() => {
							console.error("服务器完全无法访问");
							setError("无法连接到服务器，请检查后端服务是否运行");
						});
				} catch (e) {
					console.error("服务器连接检查失败:", e);
				}

				// 无论如何，5秒后重试
				setTimeout(checkModelStatus, 5000);
			}
		};

		checkModelStatus();

		// 设置定期检查，确保状态保持最新
		const intervalId = setInterval(checkModelStatus, 30000); // 每30秒检查一次

		// 清理函数
		return () => {
			clearInterval(intervalId);
			if (loadingTimeoutId) {
				clearTimeout(loadingTimeoutId);
			}
		};
	}, []); // 移除API_BASE_URL依赖项，因为它是常量

	// 清除错误
	const clearError = () => {
		setError(null);
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{/* 背景图层 */}
			<div className='app-background'></div>

			{/* 内容容器 */}
			<div className='content-container'>
				<Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
					{/* 右上角状态指示器 */}
					<Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 1000 }}>{!modelLoaded && !modelLoading ? <Chip icon={<CircularProgress size={16} color='inherit' />} label='模型加载中...' color='warning' variant='outlined' sx={{ fontWeight: "medium" }} /> : modelLoading ? <Chip icon={<CircularProgress size={16} color='inherit' />} label='模型正在加载...' color='warning' variant='outlined' sx={{ fontWeight: "medium" }} /> : <Chip icon={<CheckCircleIcon />} label='模型已加载' color='success' variant='outlined' sx={{ fontWeight: "medium" }} />}</Box>

					<Box sx={{ mb: 4, textAlign: "center" }}>
						<Typography variant='h1' component='h1' gutterBottom>
							情感分析系统
						</Typography>
						<Typography variant='h5' color='textSecondary' paragraph>
							基于语音、视频和文本的多模态情感分析
						</Typography>
					</Box>

					{error && (
						<Alert
							severity='error'
							variant='filled'
							onClose={clearError}
							action={
								<Button 
									color="inherit" 
									size="small" 
									onClick={() => {
										clearError();
										// 立即检查模型状态
										fetch(`${API_BASE_URL}/status`)
											.then(response => response.json())
											.then(data => {
												if (data.model_loaded || data.loaded) {
													setModelLoaded(true);
													setModelLoading(false);
												} else if (data.loading) {
													setModelLoaded(false);
													setModelLoading(true);
												}
											})
											.catch(() => {
												// 如果状态检查失败，尝试ping端点
												fetch(`${API_BASE_URL}/ping`, { method: "GET" })
													.catch(() => {
														setError("服务器仍然无法访问，请检查后端服务");
													});
											});
									}}
								>
									重试
								</Button>
							}
							sx={{
								mb: 2,
								bgcolor: "#31191c", // 深红色背景
								color: "#cf6679", // 红色文字
								boxShadow: "0 4px 20px rgba(207, 102, 121, 0.2)",
								borderLeft: "5px solid #cf6679",
								fontWeight: "bold",
							}}
						>
							<AlertTitle sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>错误</AlertTitle>
							{error}
						</Alert>
					)}

					<Paper elevation={3} sx={{ p: 0, mb: 4 }}>
						<EmotionTabs modelLoaded={modelLoaded} apiBaseUrl={API_BASE_URL} setError={setError} />
					</Paper>
				</Container>
			</div>
		</ThemeProvider>
	);
}

export default App;
