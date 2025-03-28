import React, { useState, useRef } from "react";
import { Box, Grid, Button, TextField, LinearProgress, FormControl, InputLabel, Select, MenuItem, Typography, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import UploadFileIcon from "@mui/icons-material/UploadFile";

// 定义录音动画组件
const RecordingAnimation = styled("div")(({ theme }) => ({
	display: "flex",
	justifyContent: "center",
	marginTop: theme.spacing(2),
	"& .bar": {
		display: "inline-block",
		width: "4px",
		height: "16px",
		margin: "0 2px",
		backgroundColor: "#03dac6", // 浅蓝色，与暗色主题匹配
		animation: "recording-animation 1.2s infinite ease-in-out",
		animationDelay: props => `${props.delay}s`,
	},
}));

function SpeechInput({ modelLoaded, apiBaseUrl, onRecognitionResult, recognizedText, setError }) {
	// 状态变量
	const [language, setLanguage] = useState("zh-CN");
	const [isRecording, setIsRecording] = useState(false);
	const [status, setStatus] = useState("准备就绪");
	const [progress, setProgress] = useState(0);
	const [showProgress, setShowProgress] = useState(false);

	// Refs
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const fileInputRef = useRef(null);

	// 检查浏览器兼容性
	const checkBrowserCompatibility = () => {
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			setError("您的浏览器不支持录音功能，请使用Chrome、Firefox或Safari的最新版本");
			return false;
		}
		return true;
	};

	// 开始/停止录音
	const toggleRecording = async () => {
		// 如果模型未加载，显示提示
		if (!modelLoaded) {
			setError("模型正在加载中，请稍后再试");
			return;
		}
		
		if (!isRecording) {
			// 检查浏览器兼容性
			if (!checkBrowserCompatibility()) {
				return;
			}
			
			try {
				setStatus("请求麦克风权限...");
				const stream = await navigator.mediaDevices.getUserMedia({ 
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true
					}
				});
				startRecording(stream);
				setIsRecording(true);
				setStatus("正在录音...");
			} catch (err) {
				console.error("获取麦克风权限失败:", err);
				
				// 提供更详细的错误信息
				if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
					setError("麦克风访问被拒绝，请在浏览器设置中允许麦克风访问权限");
				} else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
					setError("未检测到麦克风设备，请确保麦克风已正确连接");
				} else {
					setError(`无法访问麦克风: ${err.message}`);
				}
			}
		} else {
			stopRecording();
			setIsRecording(false);
			setStatus("处理中...");
			setShowProgress(true);
			setProgress(10);
		}
	};

	// 开始录音
	const startRecording = stream => {
		audioChunksRef.current = [];
		mediaRecorderRef.current = new MediaRecorder(stream);

		mediaRecorderRef.current.addEventListener("dataavailable", event => {
			audioChunksRef.current.push(event.data);
		});

		mediaRecorderRef.current.addEventListener("stop", () => {
			const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
			processAudioBlob(audioBlob);
		});

		mediaRecorderRef.current.start();
	};

	// 停止录音
	const stopRecording = () => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
		}
	};

	// 处理录音数据
	const processAudioBlob = async audioBlob => {
		setProgress(30);

		// 检查音频数据大小
		const audioSizeMB = audioBlob.size / (1024 * 1024);
		if (audioSizeMB > 10) { // 大于10MB的音频可能会处理超时
			setError(`音频文件过大 (${audioSizeMB.toFixed(2)}MB)，请将录音时间控制在1分钟以内`); 
			setStatus("文件过大");
			setShowProgress(false);
			return;
		}

		try {
			// 转换为Base64
			const reader = new FileReader();
			
			// 使用Promise包装FileReader
			const readFileAsBase64 = () => {
				return new Promise((resolve, reject) => {
					reader.onloadend = () => resolve(reader.result);
					reader.onerror = () => reject(new Error('读取文件失败'));
					reader.readAsDataURL(audioBlob);
				});
			};
			
			const base64data = await readFileAsBase64();
			setProgress(50);

			try {
				// 添加请求超时处理
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
				
				// 发送到服务器
				const response = await fetch(`${apiBaseUrl}/record`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						audio: base64data.split(",")[1],
						language: language,
					}),
					signal: controller.signal
				});
				
				// 清除超时定时器
				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
				}

				setProgress(80);
				const data = await response.json();

				setProgress(100);
				setTimeout(() => {
					setShowProgress(false);
					setProgress(0);
					setStatus("处理完成");
				}, 500);

				// 检查结果中是否有文本
				if (data.success && (!data.text || data.text.trim() === '')) {
					// 没有识别出文本，显示友好的提示
					setError('未能识别出有效文本，请尝试说话更清晰或降低背景噪音');
					return;
				}

				onRecognitionResult(data);
			} catch (error) {
				console.error("处理音频数据出错:", error);
				setStatus("处理出错");
				setShowProgress(false);
				setProgress(0);
				
				// 更详细的错误信息
				if (error.name === 'AbortError') {
					setError("请求超时，服务器响应时间过长，请尝试缩短录音时间或稍后重试");
				} else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
					setError("网络错误，请检查您的网络连接或服务器状态");
				} else {
					setError(`处理音频数据时出错: ${error.message}`);
				}
			}
		} catch (error) {
			console.error("读取音频数据出错:", error);
			setStatus("读取出错");
			setShowProgress(false);
			setProgress(0);
			setError("读取音频数据时出错，请重试");
		}
	};

	// 上传音频文件
	const handleFileUpload = event => {
		const file = event.target.files[0];
		if (file) {
			setStatus("处理音频文件...");
			setShowProgress(true);
			setProgress(10);

			const formData = new FormData();
			formData.append("file", file);
			formData.append("language", language);

			fetch(`${apiBaseUrl}/upload`, {
				method: "POST",
				body: formData,
			})
				.then(response => response.json())
				.then(data => {
					setProgress(90);
					onRecognitionResult(data);
					setProgress(100);

					setTimeout(() => {
						setShowProgress(false);
						setProgress(0);
					}, 500);
				})
				.catch(error => {
					console.error("处理音频文件出错:", error);
					setStatus("处理出错");
					setShowProgress(false);
					setError("处理音频文件时出错，请重试。");
				});
		}
	};

	return (
		<Box>
			<Grid container spacing={3}>
				<Grid item xs={12} md={6}>
					<FormControl fullWidth sx={{ mb: 3 }}>
						<InputLabel id='language-select-label'>选择语言</InputLabel>
						<Select labelId='language-select-label' id='language-select' value={language} label='选择语言' onChange={e => setLanguage(e.target.value)} disabled={isRecording}>
							<MenuItem value='zh-CN'>中文</MenuItem>
							<MenuItem value='en-US'>英文</MenuItem>
						</Select>
					</FormControl>

					<Box sx={{ display: "flex", gap: 2, mb: 3 }}>
						<Button variant={isRecording ? "contained" : "outlined"} color={isRecording ? "secondary" : "primary"} onClick={toggleRecording} disabled={!modelLoaded} startIcon={isRecording ? <StopIcon /> : <MicIcon />} sx={{ flexGrow: 1 }}>
							{isRecording ? "停止录音" : "开始录音"}
						</Button>

						<Button variant='outlined' color='primary' onClick={() => fileInputRef.current.click()} disabled={!modelLoaded || isRecording} startIcon={<UploadFileIcon />} sx={{ flexGrow: 1 }}>
							上传音频文件
						</Button>
						<input type='file' ref={fileInputRef} onChange={handleFileUpload} accept='.wav,.mp3,.flac' style={{ display: "none" }} />
					</Box>
				</Grid>

				<Grid item xs={12} md={6}>
					<Paper elevation={1} sx={{ p: 2, height: "100%", bgcolor: "#1e1e1e", border: "1px solid #333333", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)" }}>
						<Typography variant='subtitle1' gutterBottom sx={{ color: "#03dac6", fontWeight: 500 }}>
							{status}
						</Typography>

						{showProgress && (
							<Box sx={{ width: "100%", mt: 2 }}>
								<LinearProgress variant='determinate' value={progress} />
							</Box>
						)}

						{isRecording && (
							<RecordingAnimation>
								{[...Array(5)].map((_, i) => (
									<div key={i} className='bar' style={{ animationDelay: `${i * 0.2}s` }} />
								))}
							</RecordingAnimation>
						)}
					</Paper>
				</Grid>

				<Grid item xs={12}>
					<TextField
						label='识别结果'
						multiline
						rows={4}
						value={recognizedText}
						fullWidth
						variant='outlined'
						InputProps={{
							readOnly: true,
						}}
						sx={{
							"& .MuiOutlinedInput-root": {
								"& fieldset": {
									borderColor: "rgba(3, 218, 198, 0.3)",
								},
								"&:hover fieldset": {
									borderColor: "rgba(3, 218, 198, 0.6)",
								},
								bgcolor: "#1e1e1e",
							},
							"& .MuiInputLabel-root": {
								color: "#b0bec5",
							},
							"& .MuiInputBase-input": {
								color: "#ffffff",
							},
						}}
					/>
				</Grid>
			</Grid>
		</Box>
	);
}

export default SpeechInput;
