import React, { useState } from "react";
import { Box, Grid, Button, TextField, LinearProgress, FormControl, InputLabel, Select, MenuItem, Typography, Paper, Alert } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

function TextInput({ modelLoaded, apiBaseUrl, onAnalysisResult, setRecognizedText, setError }) {
	// 状态变量
	const [language, setLanguage] = useState("zh-CN");
	const [textInput, setTextInput] = useState("");
	const [status, setStatus] = useState("准备就绪");
	const [progress, setProgress] = useState(0);
	const [showProgress, setShowProgress] = useState(false);

	// 分析文本
	const analyzeText = async () => {
		if (!textInput.trim()) {
			setError("请输入要分析的文本");
			return;
		}

		setStatus("分析中...");
		setShowProgress(true);
		setProgress(30);

		try {
			const response = await fetch(`${apiBaseUrl}/analyze`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: textInput,
					language: language,
				}),
			});

			const data = await response.json();
			setProgress(90);

			if (data.success) {
				setRecognizedText(textInput);
				onAnalysisResult(data);
			} else {
				setError("分析出错: " + data.error);
			}

			setProgress(100);
			setTimeout(() => {
				setShowProgress(false);
				setProgress(0);
				setStatus("分析完成");
			}, 500);
		} catch (error) {
			console.error("分析文本出错:", error);
			setStatus("分析出错");
			setShowProgress(false);
			setError("分析文本时出错，请重试。");
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
						<Paper elevation={1} sx={{ p: 2, height: "100%", bgcolor: "#2d2d2d" }}>
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

					<Button variant='contained' color='primary' onClick={analyzeText} disabled={!modelLoaded || !textInput.trim()} startIcon={<SendIcon />} sx={{ minWidth: 120 }}>
						分析文本
					</Button>
				</Grid>
			</Grid>
		</Box>
	);
}

export default TextInput;
