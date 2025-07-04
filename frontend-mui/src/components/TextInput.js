import React, { useState } from "react";
import { Box, Grid, Button, TextField, LinearProgress, FormControl, InputLabel, Select, MenuItem, Typography, Paper, Alert, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

// 定义模型加载状态常量 (与 App.js 保持一致)
const MODEL_STATUS = {
	IDLE: "idle",
	LOADING: "loading",
	RETRYING: "retrying",
	LOADED: "loaded",
	FAILED: "failed",
};

function TextInput({ modelStatus, apiBaseUrl, onAnalysisResult, setRecognizedText, setError }) {
	// 状态变量
	const [language, setLanguage] = useState("zh-CN");
	const [textInput, setTextInput] = useState("");
	const [status, setStatus] = useState("准备就绪");
	const [progress, setProgress] = useState(0);
	const [showProgress, setShowProgress] = useState(false);
	const [analysing, setAnalysing] = useState(false);

	// 验证输入
	const validateInput = () => {
		if (!textInput.trim()) {
			setError("请输入要分析的文本");
			return false;
		}
		
		// 限制文本长度
		if (textInput.length > 5000) {
			setError("文本过长，请将文本限制在5000字符以内");
			return false;
		}
		
		// 检查是否包含有效内容（不仅仅是空格或特殊字符）
		if (!/[\u4e00-\u9fa5a-zA-Z0-9]/.test(textInput)) {
			setError("请输入包含有效文字的内容");
			return false;
		}
		
		return true;
	};

	// 分析文本
	const analyzeText = async () => {
		// 验证输入
		if (!validateInput()) {
			return;
		}

		setStatus("分析中...");
		setShowProgress(true);
		setProgress(30);
		setAnalysing(true);

		try {
			// 添加请求超时处理
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
			
			const response = await fetch(`${apiBaseUrl}/analyze`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: textInput.trim(), // 去除首尾空格
					language: language,
				}),
				signal: controller.signal
			});
			
			// 清除超时定时器
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			setProgress(90);

			if (data.success) {
				setRecognizedText(textInput);
				
				// 处理新的数据结构
				const formattedResult = {
					result: data.result.sentiment,
					emotion_type: data.result.emotion_type,
					scores: data.result.scores,
					text: textInput
				};
				
				onAnalysisResult(formattedResult);
			} else {
				setError("分析出错: " + (data.error || "未知错误"));
			}

			setProgress(100);
			setTimeout(() => {
				setShowProgress(false);
				setProgress(0);
				setStatus("分析完成");
				setAnalysing(false);
			}, 500);
		} catch (error) {
			console.error("分析文本出错:", error);
			setStatus("分析出错");
			setShowProgress(false);
			setProgress(0);
			setAnalysing(false);
			
			// 更详细的错误信息
			if (error.name === 'AbortError') {
				setError("请求超时，服务器响应时间过长，请稍后重试");
			} else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
				setError("网络错误，请检查您的网络连接或服务器状态");
			} else {
				setError(`分析文本时出错: ${error.message}`);
			}
		}
	};

	return (
		<Box>
			<Grid container spacing={3}>
				<Grid item xs={12} md={6}>
					<FormControl fullWidth sx={{ mb: 3 }}>
						<InputLabel id='language-select-label'>选择语言</InputLabel>
						<Select labelId='language-select-label' id='language-select' value={language} label='选择语言' onChange={e => setLanguage(e.target.value)}>
							<MenuItem value='zh-CN'>中文</MenuItem>
							<MenuItem value='en-US'>英文</MenuItem>
						</Select>
					</FormControl>
				</Grid>

				<Grid item xs={12} md={6}>
					{showProgress && (
						<Paper elevation={1} sx={{ p: 2, height: "100%", bgcolor: "#1e1e1e", border: "1px solid #333333", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)" }}>
							<Typography variant='subtitle1' gutterBottom>
								{status}
							</Typography>
							<Box sx={{ width: "100%", mt: 2 }}>
								<LinearProgress variant='determinate' value={progress} color='primary' />
							</Box>
						</Paper>
					)}
				</Grid>

				<Grid item xs={12}>
					<TextField
						label='输入文本'
						multiline
						rows={5}
						placeholder='请输入要分析的文本...'
						value={textInput}
						onChange={e => setTextInput(e.target.value)}
						fullWidth
						variant='outlined'
						sx={{
							mb: 3,
							"& .MuiOutlinedInput-root": {
								"& fieldset": {
									borderColor: "rgba(255, 255, 255, 0.23)",
								},
								"&:hover fieldset": {
									borderColor: "rgba(255, 255, 255, 0.5)",
								},
							},
							"& .MuiInputLabel-root": {
								color: "text.secondary",
							},
							"& .MuiInputBase-input": {
								color: "text.primary",
							},
						}}
					/>

					<Button variant='contained' color='primary' onClick={analyzeText} disabled={modelStatus !== MODEL_STATUS.LOADED || !textInput.trim()} startIcon={<SendIcon />} sx={{ minWidth: 120 }}>
						{analysing ? <CircularProgress size={24} color='inherit' /> : "分析文本"}
					</Button>
				</Grid>
			</Grid>

			{modelStatus !== MODEL_STATUS.LOADED && (
				<Alert severity='warning' sx={{ mt: 2 }}>
					模型正在加载中，加载完成后即可分析文本。
				</Alert>
			)}
		</Box>
	);
}

export default TextInput;
