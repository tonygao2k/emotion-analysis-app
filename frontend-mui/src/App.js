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

// API基础URL
const API_BASE_URL = "http://localhost:5001/api";

function App() {
	// 状态变量
	const [modelLoaded, setModelLoaded] = useState(false);
	const [error, setError] = useState(null);

	// 检查模型加载状态
	useEffect(() => {
		const checkModelStatus = async () => {
			try {
				const response = await fetch(`${API_BASE_URL}/status`);
				const data = await response.json();

				if (data.model_loaded) {
					setModelLoaded(true);
				} else {
					setTimeout(checkModelStatus, 2000);
				}
			} catch (error) {
				console.error("获取模型状态出错:", error);
				setTimeout(checkModelStatus, 5000);
			}
		};

		checkModelStatus();
	}, []);

	// 清除错误
	const clearError = () => {
		setError(null);
	};

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
				{/* 右上角状态指示器 */}
				<Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
					{!modelLoaded ? (
						<Chip
							icon={<CircularProgress size={16} color="inherit" />}
							label="模型加载中..."
							color="warning"
							variant="outlined"
							sx={{ fontWeight: 'medium' }}
						/>
					) : (
						<Chip
							icon={<CheckCircleIcon />}
							label="模型已加载"
							color="success"
							variant="outlined"
							sx={{ fontWeight: 'medium' }}
						/>
					)}
				</Box>

				<Box sx={{ mb: 4, textAlign: "center" }}>
					<Typography variant='h1' component='h1' gutterBottom>
						情感分析系统
					</Typography>
					<Typography variant='h5' color='textSecondary' paragraph>
						基于语音和文本的多语言情感分析
					</Typography>
				</Box>

				{error && (
					<Alert
						severity='error'
						variant='filled'
						onClose={clearError}
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
		</ThemeProvider>
	);
}

export default App;
