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
import ErrorIcon from "@mui/icons-material/Error";
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

// 定义模型加载状态
const MODEL_STATUS = {
	IDLE: "idle", // 初始状态或加载完成
	LOADING: "loading", // 首次检查或已知正在加载
	RETRYING: "retrying", // 加载中，使用退避策略重试
	LOADED: "loaded", // 确认已加载
	FAILED: "failed", // 加载失败或超时
};

function App() {
	// 状态变量
	const [modelStatus, setModelStatus] = useState(MODEL_STATUS.LOADING);
	const [error, setError] = useState(null);
	const [retryTrigger, setRetryTrigger] = useState(0);

	// 优化后的模型状态检查逻辑
	useEffect(() => {
		let timeoutId = null;
		let retryCount = 0;
		const maxRetries = 10; // 最大重试次数
		const initialDelay = 2000; // 初始延迟 (2s)
		const maxDelay = 30000; // 最大延迟 (30s)

		const checkStatus = async () => {
			try {
				console.log(`检查模型状态... (尝试 #${retryCount + 1})`);
				const response = await fetch(`${API_BASE_URL}/status`);

				if (!response.ok) {
					throw new Error(`服务器状态请求失败: ${response.status} ${response.statusText}`);
				}

				const data = await response.json();
				console.log("模型状态响应:", data);

				setError(null);

				// 处理新的详细状态格式，同时保持向后兼容
				const statusInfo = data.status || data.legacy_status;

				if (statusInfo) {
					// 新格式：检查 overall_status
					if (statusInfo.overall_status === "ready" || statusInfo.loaded) {
						console.log("模型已加载完成");
						setModelStatus(MODEL_STATUS.LOADED);
						clearTimeout(timeoutId);
						return;
					} else if (statusInfo.overall_status === "loading" || statusInfo.loading) {
						console.log("模型仍在加载中...");
						setModelStatus(MODEL_STATUS.RETRYING);
						scheduleNextCheck();
					} else if (statusInfo.overall_status === "failed") {
						console.log("模型加载失败");
						setError("AI模型加载失败，部分功能可能不可用");
						setModelStatus(MODEL_STATUS.FAILED);
						return;
					} else {
						console.log("模型状态未知，继续重试...");
						setModelStatus(MODEL_STATUS.RETRYING);
						scheduleNextCheck();
					}
				} else {
					console.log("无法获取模型状态信息，继续重试...");
					setModelStatus(MODEL_STATUS.RETRYING);
					scheduleNextCheck();
				}
			} catch (err) {
				console.error("获取模型状态出错:", err);
				setError(`获取模型状态失败: ${err.message}. 正在尝试重新连接...`);
				setModelStatus(MODEL_STATUS.RETRYING);
				scheduleNextCheck();
			}
		};

		const scheduleNextCheck = () => {
			clearTimeout(timeoutId);
			if (retryCount >= maxRetries) {
				console.error("模型加载达到最大重试次数，停止检查。");
				setError("模型加载超时，请检查后端服务或稍后重试。");
				setModelStatus(MODEL_STATUS.FAILED);
				return;
			}

			const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
			console.log(`下一次检查将在 ${delay / 1000} 秒后进行`);

			timeoutId = setTimeout(() => {
				retryCount++;
				checkStatus();
			}, delay);
		};

		// 开始检查
		setModelStatus(MODEL_STATUS.LOADING);
		checkStatus();

		return () => {
			clearTimeout(timeoutId);
		};
	}, [retryTrigger]); // 添加 retryTrigger 依赖

	// 清除错误
	const clearError = () => {
		setError(null);
		// 如果之前是失败状态，可以尝试重新触发检查
		if (modelStatus === MODEL_STATUS.FAILED) {
			console.log("用户触发重试...");
			setModelStatus(MODEL_STATUS.LOADING);
			setRetryTrigger(prev => prev + 1); // 改变状态以重新运行useEffect
		}
	};

	// 手动重试函数 (用于按钮)
	const triggerRetry = () => {
		clearError();
		console.log("手动触发模型状态检查...");
		setModelStatus(MODEL_STATUS.LOADING);
		setRetryTrigger(prev => prev + 1); // 改变状态以重新运行useEffect
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{/* 背景图层 */}
			<div className='app-background'></div>

			{/* 内容容器 */}
			<div className='content-container'>
				<Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
					{/* 右上角状态指示器 - 更新以反映新状态 */}
					<Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 1000 }}>
						{modelStatus === MODEL_STATUS.LOADING && <Chip icon={<CircularProgress size={16} color='inherit' />} label='模型加载中...' color='warning' variant='outlined' sx={{ fontWeight: "medium" }} />}
						{modelStatus === MODEL_STATUS.RETRYING && <Chip icon={<CircularProgress size={16} color='inherit' />} label='模型加载中 (重试)...' color='warning' variant='outlined' sx={{ fontWeight: "medium" }} />}
						{modelStatus === MODEL_STATUS.LOADED && <Chip icon={<CheckCircleIcon />} label='模型已加载' color='success' variant='outlined' sx={{ fontWeight: "medium" }} />}
						{modelStatus === MODEL_STATUS.FAILED && <Chip icon={<ErrorIcon />} label='模型加载失败' color='error' variant='outlined' sx={{ fontWeight: "medium" }} />}
					</Box>

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
									color='inherit'
									size='small'
									onClick={triggerRetry} // 使用新的触发函数
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
						{/* 将 modelStatus 传递给子组件 */}
						<EmotionTabs modelStatus={modelStatus} apiBaseUrl={API_BASE_URL} setError={setError} />
					</Paper>
				</Container>
			</div>
		</ThemeProvider>
	);
}

export default App;
