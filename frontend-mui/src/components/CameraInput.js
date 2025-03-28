import React, { useState, useRef, useEffect } from "react";
import { Box, Button, Typography, Paper, Alert, CircularProgress } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import StopIcon from "@mui/icons-material/Stop";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";

/**
 * 摄像头实时情感分析组件
 *
 * @param {string} apiBaseUrl - API基础URL
 * @param {function} setResult - 设置分析结果的函数
 * @param {boolean} modelLoaded - 模型是否已加载
 * @param {function} setError - 设置错误信息的函数
 * @returns {JSX.Element} 摄像头实时情感分析组件
 */
const CameraInput = ({ apiBaseUrl, setResult, modelLoaded, setError }) => {
	// 状态管理
	const [isRecording, setIsRecording] = useState(false);
	const [cameraError, setCameraError] = useState(null);
	const [currentEmotion, setCurrentEmotion] = useState(null);
	const [emotionHistory, setEmotionHistory] = useState([]);
	const [analyzing, setAnalyzing] = useState(false);
	const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
	const [imageQuality, setImageQuality] = useState(0.7); // 图像质量，0-1之间
	const [analysisInterval, setAnalysisInterval] = useState(2000); // 分析间隔，默认2秒
	// 暂时不使用帧跳过逻辑
	// const [skipFrameCount, setSkipFrameCount] = useState(0); // 跳过的帧计数
	// const [maxSkipFrames, setMaxSkipFrames] = useState(5); // 最大跳过帧数
	const [showSettings, setShowSettings] = useState(false); // 是否显示设置面板

	// 引用
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const timerRef = useRef(null);
	const animationFrameRef = useRef(null);

	// 检查摄像头状态的函数已移除，直接使用modelLoaded属性判断

	// 开始摄像头
	const startCamera = async () => {
		try {
			// 检查模型是否已加载
			if (!modelLoaded) {
				setCameraError("模型尚未加载完成，请稍后再试");
				return;
			}

			// 直接使用modelLoaded属性判断，不再调用checkApiStatus

			// 获取摄像头权限
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			console.log('成功获取摄像头流');

			// 设置视频源
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				console.log('已设置视频源');

				// 清除现有事件监听器（如果有）
				const oldVideo = videoRef.current;
				const loadHandler = () => {
					console.log('视频已加载，开始分析...');
					// 移除事件监听器以避免多次触发
					oldVideo.removeEventListener('loadeddata', loadHandler);
					// 直接调用分析函数，不通过状态更新
					startAnalysis();
				};

				// 添加视频加载事件监听器
				videoRef.current.addEventListener('loadeddata', loadHandler);
				
				// 如果视频已经加载完成，直接调用分析函数
				if (videoRef.current.readyState >= 2) {
					console.log('视频已经加载完成，直接开始分析');
					startAnalysis();
				}
			}
		} catch (error) {
			console.error("获取摄像头失败:", error);
			setCameraError(`无法访问摄像头: ${error.message}`);
		}
	};

	// 停止摄像头
	const stopCamera = () => {
		console.log('停止摄像头分析');
		// 停止分析
		if (timerRef.current) {
			console.log('清除定时器');
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		// 停止渲染循环
		if (animationFrameRef.current) {
			console.log('停止渲染循环');
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// 停止视频流
		if (videoRef.current && videoRef.current.srcObject) {
			console.log('停止视频流');
			const tracks = videoRef.current.srcObject.getTracks();
			tracks.forEach(track => track.stop());
			videoRef.current.srcObject = null;
		}

		// 清空画布
		if (canvasRef.current) {
			console.log('清空画布');
			const ctx = canvasRef.current.getContext("2d");
			ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		}

		// 计算平均情绪
		if (emotionHistory.length > 0) {
			console.log('计算平均情绪，历史记录条目数：', emotionHistory.length);
			const avgEmotions = calculateAverageEmotions(emotionHistory);
			console.log('平均情绪结果：', avgEmotions);
			// 确保结果传递给父组件
			setResult(avgEmotions);
		} else {
			console.log('没有历史记录，无法计算平均情绪');
		}

		setIsRecording(false);
	};

	// 开始分析
	const startAnalysis = () => {
		console.log('开始分析函数被调用');
		if (!modelLoaded) {
			console.error('模型未加载，无法开始分析');
			setError("模型尚未加载完成，请稍后再试");
			stopCamera();
			return;
		}

		// 清空历史记录
		setEmotionHistory([]);
		console.log('历史记录已清空');

		// 检查视频元素
		if (!videoRef.current) {
			console.error('视频元素不存在');
			setCameraError('视频元素不存在');
			return;
		}

		// 检查画布元素
		if (!canvasRef.current) {
			console.error('画布元素不存在');
			setCameraError('画布元素不存在');
			return;
		}

		// 设置分析状态
		setIsRecording(true);
		console.log('开始设置分析定时器');

		// 清除现有定时器（如果有）
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		// 设置新的定时器，每秒分析一次
		timerRef.current = setInterval(() => {
			console.log('定时器触发，准备分析帧');
			// 直接调用分析函数，不依赖isRecording状态
			if (videoRef.current && canvasRef.current && !analyzing) {
				console.log('条件满足，调用分析函数');
				captureAndAnalyzeDirectly();
			} else {
				console.log('无法分析：', {
					videoExists: !!videoRef.current,
					canvasExists: !!canvasRef.current,
					analyzing: analyzing
				});
			}
		}, analysisInterval);

		// 开始渲染循环
		console.log('开始渲染循环');
		renderLoopDirectly();

		// 立即执行一次分析
		console.log('立即执行一次分析');
		captureAndAnalyzeDirectly();
	};

	// 直接渲染循环，不依赖isRecording状态
	const renderLoopDirectly = () => {
		if (!videoRef.current || !canvasRef.current) {
			console.log('视频或画布元素不存在');
			return;
		}

		// 检查视频是否已加载并准备好
		if (videoRef.current.readyState !== 4) {
			console.log('视频元素尚未准备好，当前状态：', videoRef.current.readyState);
			animationFrameRef.current = requestAnimationFrame(renderLoopDirectly);
			return;
		}

		const ctx = canvasRef.current.getContext("2d");
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

		// 检查视频尺寸
		if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
			// 更新画布尺寸以匹配视频
			if (canvasRef.current.width !== videoRef.current.videoWidth || 
				canvasRef.current.height !== videoRef.current.videoHeight) {
				canvasRef.current.width = videoRef.current.videoWidth;
				canvasRef.current.height = videoRef.current.videoHeight;
			}

			// 绘制视频
			ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
		} else {
			console.log('视频尺寸无效：', videoRef.current.videoWidth, videoRef.current.videoHeight);
		}

		// 继续渲染循环
		animationFrameRef.current = requestAnimationFrame(renderLoopDirectly);
	};

	// 直接分析当前帧，不依赖isRecording状态
	const captureAndAnalyzeDirectly = async () => {
		if (!videoRef.current || !canvasRef.current || analyzing) {
			console.log('无法分析：', {
				videoExists: !!videoRef.current,
				canvasExists: !!canvasRef.current,
				analyzing: analyzing
			});
			return;
		}

		// 检查视频是否已准备好
		if (videoRef.current.readyState !== 4) {
			console.log('视频尚未准备好，无法分析');
			return;
		}

		// 检查时间间隔，避免频繁分析
		const now = Date.now();
		if (now - lastAnalysisTime < analysisInterval) {
			console.log('分析间隔太短，跳过当前帧，上次分析时间：', new Date(lastAnalysisTime));
			return;
		}

		// 暂时禁用帧跳过逻辑，确保每次都发送分析请求
		console.log('准备分析当前帧');
		

		// 检查视频尺寸
		if (videoRef.current.videoWidth <= 0 || videoRef.current.videoHeight <= 0) {
			console.log('视频尺寸无效，无法分析');
			return;
		}

		// 更新上次分析时间
		setLastAnalysisTime(now);

		try {
			setAnalyzing(true);

			// 捕获当前帧
			console.log('开始捕获视频帧，视频尺寸：', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
			const canvas = document.createElement("canvas");
			canvas.width = videoRef.current.videoWidth;
			canvas.height = videoRef.current.videoHeight;
			const ctx = canvas.getContext("2d");
			
			try {
				// 绘制视频帧到画布
				ctx.drawImage(videoRef.current, 0, 0);
				console.log('成功捕获视频帧');
			} catch (drawError) {
				console.error('绘制视频帧到画布失败：', drawError);
				setError(`捕获视频帧失败: ${drawError.message}`);
				setAnalyzing(false);
				return;
			}

			// 转换为base64，使用较低的图像质量减少数据传输量
			let dataUrl;
			try {
				dataUrl = canvas.toDataURL("image/jpeg", imageQuality);
				console.log('成功转换为base64，数据长度：', dataUrl.length);
			} catch (dataUrlError) {
				console.error('转换为base64失败：', dataUrlError);
				setError(`转换图像格式失败: ${dataUrlError.message}`);
				setAnalyzing(false);
				return;
			}

			// 发送到后端分析
			const requestUrl = `${apiBaseUrl}/analyze_frame`;
			console.log('开始发送分析请求到：', requestUrl);
			console.log('API基础URL：', apiBaseUrl);
			
			// 检查apiBaseUrl是否正确
			if (!apiBaseUrl) {
				console.error('apiBaseUrl为空，无法发送请求');
				setError('配置错误: API基础URL未设置');
				setAnalyzing(false);
				return;
			}
			
			// 准备请求数据
			const requestData = {
				image: dataUrl
			};
			
			// 输出请求信息（不输出完整图像数据）
			console.log('请求数据：', {
				url: requestUrl,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				dataLength: dataUrl.length
			});
			
			let response;
			try {
				// 使用更详细的错误处理
				response = await fetch(requestUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				});
				console.log('成功收到响应，状态码：', response.status);
			} catch (fetchError) {
				console.error('请求发送失败：', fetchError);
				setError(`网络错误: 无法连接到后端服务 (${fetchError.message})`);
				setAnalyzing(false);
				return;
			}

			// 检查响应是否是JSON格式
			const contentType = response.headers.get("content-type");
			console.log('响应内容类型：', contentType);
			if (!contentType || !contentType.includes("application/json")) {
				console.error('响应不是JSON格式：', contentType);
				setError("网络错误: 检测到代理拦截或服务器响应格式错误");
				setAnalyzing(false);
				return;
			}

			if (!response.ok) {
				// 如果是400错误，可能是未检测到人脸
				if (response.status === 400) {
					// 继续分析，不显示错误
				} else {
					setError(`视频分析失败: ${response.status} ${response.statusText}`);
				}

				setAnalyzing(false);
				return;
			}

			// 尝试解析JSON响应
			let result;
			try {
				const text = await response.text();

				if (!text || text.trim() === "") {
					throw new Error("空响应");
				}

				if (text.includes("<html>") || text.includes("<!DOCTYPE html>")) {
					throw new Error("收到HTML响应而非JSON，可能存在代理拦截");
				}

				result = JSON.parse(text);
			} catch (parseError) {
				setError(`视频分析失败: 无法解析响应 (${parseError.message})`);
				setAnalyzing(false);
				return;
			}

			if (!result) {
				setError("视频分析失败: 响应为空");
				setAnalyzing(false);
				return;
			}

			if (result.success) {
				console.log('分析成功，结果：', result);
				// 检查必要的字段是否存在
				if (!result.dominant_emotion || !result.emotions) {
					console.error('响应数据格式错误：', result);
					setError("视频分析失败: 后端响应数据格式错误");
					setAnalyzing(false);
					return;
				}

				// 将后端返回的数据格式转换为前端期望的格式
				const emotionData = {
					dominant: result.dominant_emotion,
					dominant_zh: result.dominant_emotion_zh || getEmotionChineseName(result.dominant_emotion),
					all_emotions: result.emotions,
					confidence: result.emotions[result.dominant_emotion] || 0,
					processing_info: result.processing_info,
				};

				console.log('处理后的情绪数据：', emotionData);
				setCurrentEmotion(emotionData);

				// 添加到历史记录
				setEmotionHistory(prev => {
					const newHistory = [...prev, emotionData];
					console.log('更新历史记录，当前条目数：', newHistory.length);
					return newHistory;
				});

				// 在画布上绘制情绪标签
				if (canvasRef.current && result.face_location) {
					console.log('绘制人脸框和情绪标签，位置：', result.face_location);
					drawEmotionOnCanvas(result.face_location, emotionData);
				} else {
					console.log('无法绘制人脸框：', {
						canvasExists: !!canvasRef.current,
						faceLocationExists: !!result.face_location
					});
				}
			} else {
				setError(`视频分析失败: ${result.error || "未知错误"}`);
			}
		} catch (error) {
			setError(`视频分析失败: ${error.toString()}`);
		} finally {
			setAnalyzing(false);
		}
	};

	// 在画布上绘制情绪标签
	const drawEmotionOnCanvas = (faceLocation, emotionData) => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");

		// 不清除画布，因为renderLoop已经绘制了视频和清除了画布
		// ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 绘制人脸框
		// faceLocation可能是数组[x, y, w, h]或对象{x, y, width, height}
		let x, y, w, h;

		if (Array.isArray(faceLocation)) {
			[x, y, w, h] = faceLocation;
		} else {
			x = faceLocation.x;
			y = faceLocation.y;
			w = faceLocation.width;
			h = faceLocation.height;
		}

		// 绘制人脸框
		ctx.strokeStyle = "#03dac6"; // 使用青色主题
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, w, h);

		// 绘制情绪标签 - 只显示中文
		const label = `${emotionData.dominant_zh || getEmotionChineseName(emotionData.dominant)} (${Math.round(emotionData.confidence * 100)}%)`;
		ctx.font = "16px Arial";
		ctx.fillStyle = "#03dac6"; // 使用青色主题
		ctx.fillText(label, x, y - 10);
	};

	// 获取情绪的中文名称
	const getEmotionChineseName = emotion => {
		const emotionMap = {
			angry: "愤怒",
			disgust: "厌恶",
			fear: "恐惧",
			happy: "高兴",
			sad: "悲伤",
			surprise: "惊讶",
			neutral: "平静",
		};

		return emotionMap[emotion] || "未知";
	};

	// 计算平均情绪
	const calculateAverageEmotions = emotionHistory => {
		// 计算主要情绪
		const emotionCounts = emotionHistory.reduce((acc, emotion) => {
			acc[emotion.dominant] = (acc[emotion.dominant] || 0) + 1;
			return acc;
		}, {});

		const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => (emotionCounts[a] > emotionCounts[b] ? a : b), Object.keys(emotionCounts)[0]);

		// 计算平均情绪值
		const emotionAvg = {};
		const emotions = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];

		emotions.forEach(emotion => {
			const values = emotionHistory.map(e => e.all_emotions[emotion]).filter(v => v !== undefined);

			emotionAvg[emotion] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
		});

		// 映射到我们的情感分类
		const emotionMapping = {
			angry: "消极",
			disgust: "消极",
			fear: "消极",
			sad: "消极",
			happy: "积极",
			surprise: "中性",
			neutral: "中性",
		};

		const mappedEmotion = emotionMapping[dominantEmotion] || "中性";

		// 返回结果
		return {
			success: true,
			video_emotion: {
				success: true,
				result: mappedEmotion,
				confidence: emotionAvg[dominantEmotion] || 0,
				details: {
					dominant: dominantEmotion,
					dominant_zh: getEmotionChineseName(dominantEmotion),
					confidence: emotionAvg[dominantEmotion] || 0,
					all_emotions: emotionAvg,
				},
			},
			text_emotion: {
				success: true,
				result: "中性", // 默认值，因为摄像头分析没有文本
				scores: [0.2, 0.2, 0.4, 0.1, 0.1] // 默认中性的分数分布
			},
			combined_result: mappedEmotion,
			result: mappedEmotion, // 添加这个字段以兼容其他分析方式
			timestamp: new Date().toISOString(),
			history_length: emotionHistory.length,
			history_data: emotionHistory.slice(-5) // 保存最近5条历史记录
		};
	};

	// 清理资源
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	// 渲染情绪图标
	const renderEmotionIcon = () => {
		if (!currentEmotion) return null;

		const { dominant } = currentEmotion;

		switch (dominant) {
			case "happy":
				return <SentimentSatisfiedAltIcon sx={{ color: "#03dac6", fontSize: 40 }} />;
			case "angry":
			case "disgust":
			case "fear":
			case "sad":
				return <SentimentVeryDissatisfiedIcon sx={{ color: "#cf6679", fontSize: 40 }} />;
			default:
				return <SentimentNeutralIcon sx={{ color: "#64ffda", fontSize: 40 }} />;
		}
	};

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant='h6' gutterBottom>
				通过摄像头实时分析情感
			</Typography>
			<Typography variant='body2' color='textSecondary' paragraph>
				使用摄像头实时捕捉面部表情，系统将分析您的情绪状态并提供实时反馈。
			</Typography>

			{cameraError && (
				<Alert severity='error' sx={{ mb: 2 }}>
					{cameraError}
				</Alert>
			)}

			{!modelLoaded && (
				<Alert severity='warning' sx={{ mb: 2, fontWeight: "bold" }}>
					模型尚未加载完成，请稍后再试。摄像头分析功能暂时不可用。
				</Alert>
			)}

			<Alert severity='info' sx={{ mb: 2 }}>
				请确保光线充足，面部清晰可见，以获得最佳分析效果。
			</Alert>

			<Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
				<Button variant='contained' color={isRecording ? "error" : "primary"} startIcon={isRecording ? <StopIcon /> : <VideocamIcon />} onClick={isRecording ? stopCamera : startCamera} disabled={!modelLoaded} sx={{ mr: 2 }}>
					{isRecording ? "停止分析" : "开始摄像头分析"}
				</Button>
				<Button variant='contained' color='secondary' onClick={() => setShowSettings(prev => !prev)} sx={{ mr: 2 }}>
					{showSettings ? "隐藏设置" : "显示设置"}
				</Button>
			</Box>

			{showSettings && (
				<Box sx={{ mb: 2 }}>
					<Typography variant='h6' gutterBottom>
						性能设置
					</Typography>
					<Typography variant='body2' color='textSecondary' paragraph>
						调整以下设置以优化分析性能。
					</Typography>
					<Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
						<Typography variant='body1' color='textSecondary'>
							图像质量：
						</Typography>
						<input type='range' min={0} max={1} step={0.1} value={imageQuality} onChange={e => setImageQuality(parseFloat(e.target.value))} />
						<Typography variant='body1' color='textSecondary'>
							{imageQuality * 100}%
						</Typography>
					</Box>
					<Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
						<Typography variant='body1' color='textSecondary'>
							分析间隔：
						</Typography>
						<input type='range' min={1000} max={5000} step={100} value={analysisInterval} onChange={e => setAnalysisInterval(parseInt(e.target.value))} />
						<Typography variant='body1' color='textSecondary'>
							{analysisInterval / 1000} 秒
						</Typography>
					</Box>
					{/* 暂时禁用帧跳过设置
					<Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
						<Typography variant='body1' color='textSecondary'>
							最大跳过帧数：
						</Typography>
						<input type='range' min={1} max={10} step={1} value={5} onChange={e => console.log('跳过帧数设置已禁用')} />
						<Typography variant='body1' color='textSecondary'>
							5 帧
						</Typography>
					</Box>
					*/}
				</Box>
			)}

			<Box sx={{ display: "flex", justifyContent: "center", position: "relative" }}>
				<Paper
					elevation={3}
					sx={{
						width: "100%",
						maxWidth: 640,
						height: "auto",
						position: "relative",
						overflow: "hidden",
						borderRadius: 2,
					}}
				>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						style={{
							width: "100%",
							height: "auto",
							display: "block",
						}}
					/>
					<canvas
						ref={canvasRef}
						width={640}
						height={480}
						style={{
							width: "100%",
							height: "auto",
							display: isRecording ? "block" : "none",
							position: "absolute",
							top: 0,
							left: 0,
						}}
					/>

					{analyzing && (
						<Box
							sx={{
								position: "absolute",
								top: 10,
								right: 10,
								bgcolor: "rgba(0,0,0,0.5)",
								borderRadius: "50%",
								p: 1,
							}}
						>
							<CircularProgress size={20} color='primary' />
						</Box>
					)}

					{currentEmotion && (
						<Box
							sx={{
								position: "absolute",
								bottom: 0,
								left: 0,
								right: 0,
								bgcolor: "rgba(0,0,0,0.7)",
								p: 2,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 2,
							}}
						>
							{renderEmotionIcon()}
							<Typography variant='h6' color='white'>
								检测到的情绪: {currentEmotion.dominant_zh || getEmotionChineseName(currentEmotion.dominant)}({Math.round(currentEmotion.confidence * 100)}%)
							</Typography>
						</Box>
					)}

					{!isRecording && !videoRef.current?.srcObject && (
						<Box
							sx={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: "rgba(0,0,0,0.1)",
								flexDirection: "column",
							}}
						>
							<VideocamIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
							<Typography variant='body1' color='text.secondary'>
								点击"开始摄像头分析"按钮启动摄像头
							</Typography>
						</Box>
					)}
				</Paper>
			</Box>

			{emotionHistory.length > 0 && (
				<Box sx={{ mt: 3, textAlign: "center" }}>
					<Typography variant='body2' color='textSecondary'>
						已分析 {emotionHistory.length} 帧
					</Typography>
				</Box>
			)}
		</Box>
	);
};

export default CameraInput;
