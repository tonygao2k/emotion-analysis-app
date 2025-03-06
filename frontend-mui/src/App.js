import React, { useState, useEffect, useRef } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Zoom from "@mui/material/Zoom";
import Fade from "@mui/material/Fade";
import "./App.css";

// 导入组件
import EmotionTabs from "./components/EmotionTabs";

// 创建深色主题
const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#90caf9",
		},
		secondary: {
			main: "#f48fb1",
		},
		background: {
			default: "#121212",
			paper: "#1e1e1e",
		},
		text: {
			primary: "#ffffff",
			secondary: "#b0b0b0",
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
		h1: {
			fontSize: "2.5rem",
			fontWeight: 500,
		},
		h5: {
			fontWeight: 500,
		},
	},
	components: {
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundColor: "#1e1e1e",
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
				<Box sx={{ mb: 4, textAlign: "center" }}>
					<Typography variant='h1' component='h1' gutterBottom>
						情感分析系统
					</Typography>
					<Typography variant='h5' color='textSecondary' paragraph>
						基于语音和文本的多语言情感分析
					</Typography>
				</Box>

				{error && (
					<Zoom in={!!error}>
						<Alert
							severity='error'
							variant='filled'
							onClose={clearError}
							sx={{
								mb: 2,
								bgcolor: "#ef5350", // 浅红色背景
								boxShadow: "0 4px 20px rgba(239, 83, 80, 0.3)",
								borderLeft: "5px solid #e57373",
								fontWeight: "bold",
							}}
						>
							<AlertTitle sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>错误</AlertTitle>
							{error}
						</Alert>
					</Zoom>
				)}

				<Paper elevation={3} sx={{ p: 0, mb: 4 }}>
					<EmotionTabs modelLoaded={modelLoaded} apiBaseUrl={API_BASE_URL} setError={setError} />
				</Paper>

				<Box sx={{ mt: 2 }}>
					{!modelLoaded ? (
						<Zoom in={true}>
							<Alert
								severity='warning'
								variant='filled'
								sx={{
									bgcolor: "#ef5350", // 使用浅红色背景
									boxShadow: "0 4px 20px rgba(239, 83, 80, 0.3)",
									borderLeft: "5px solid #e57373",
									fontWeight: "bold",
									animation: "pulse 2s infinite",
								}}
							>
								<AlertTitle sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>模型加载中</AlertTitle>
								请稍候，模型正在后台加载。
							</Alert>
						</Zoom>
					) : (
						<Fade in={true} timeout={1000}>
							<Alert
								severity='success'
								variant='filled'
								sx={{
									bgcolor: "#81c784", // 浅绿色背景
									boxShadow: "0 4px 20px rgba(129, 199, 132, 0.3)",
									borderLeft: "5px solid #a5d6a7",
									fontWeight: "bold",
								}}
							>
								<AlertTitle sx={{ fontSize: "1.2rem", fontWeight: "bold" }}>模型已加载</AlertTitle>
								您可以开始使用情感分析功能。
							</Alert>
						</Fade>
					)}
				</Box>
			</Container>
		</ThemeProvider>
	);
}

export default App;
