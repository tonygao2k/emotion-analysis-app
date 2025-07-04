import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Typography, Alert, LinearProgress } from '@mui/material'; 
import VideocamIcon from '@mui/icons-material/Videocam';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// 定义模型加载状态常量 (与 App.js 保持一致)
const MODEL_STATUS = {
	IDLE: "idle",
	LOADING: "loading",
	RETRYING: "retrying",
	LOADED: "loaded",
	FAILED: "failed",
};

/**
 * 视频上传和分析组件
 * 
 * @param {string} apiBaseUrl - API基础URL
 * @param {function} setResult - 设置分析结果的函数
 * @param {string} modelStatus - 模型加载状态 ('idle', 'loading', 'retrying', 'loaded', 'failed')
 * @param {function} setError - 设置错误信息的函数
 * @returns {JSX.Element} 视频上传和分析组件
 */
const VideoInput = ({ apiBaseUrl, setResult, modelStatus, setError }) => {
	// 初始化状态变量
	const [uploading, setUploading] = useState(false);
	const [videoFile, setVideoFile] = useState(null);
	const [progress, setProgress] = useState(0); 
	const [taskId, setTaskId] = useState(null); 
	const [pollingIntervalId, setPollingIntervalId] = useState(null); 
	const [analysisStatus, setAnalysisStatus] = useState("idle"); 

	// 清理函数
	useEffect(() => {
		return () => {
			if (pollingIntervalId) {
				clearInterval(pollingIntervalId);
			}
		};
	}, [pollingIntervalId]);

	// 文件选择处理函数
	const handleFileChange = (event) => {
		const file = event.target.files[0];
		if (file) {
			setVideoFile(file);
			// 重置状态以便重新上传
			setError(null);
			setResult(null);
			setProgress(0);
			setTaskId(null);
			setAnalysisStatus("idle");
			if (pollingIntervalId) {
				clearInterval(pollingIntervalId);
				setPollingIntervalId(null);
			}
		}
	};

	// --- 新增：轮询任务状态函数 (与 VideoInput.new.js 类似) ---
	const pollTaskStatus = useCallback(async (currentTaskId) => {
		if (!currentTaskId) return;
		try {
			const response = await fetch(`${apiBaseUrl}/task_status/${currentTaskId}`);
			const data = await response.json();
			if (data.success) {
				setAnalysisStatus(data.status);
				if (data.status === "completed") {
					// 注意：后端返回的 result 嵌套了一层，需要解开
					setResult(data.result?.result || data.result); 
					setError(null);
					setUploading(false);
					setProgress(100);
					setTaskId(null);
					if (pollingIntervalId) clearInterval(pollingIntervalId);
					setPollingIntervalId(null);
				} else if (data.status === "failed") {
					setError(`视频分析失败: ${data.error}`);
					setResult(null);
					setUploading(false);
					setTaskId(null);
					if (pollingIntervalId) clearInterval(pollingIntervalId);
					setPollingIntervalId(null);
				} else {
					console.log(`任务 ${currentTaskId} 状态: ${data.status}`);
				}
			} else {
				console.warn(`无法获取任务 ${currentTaskId} 的状态: ${data.error}`);
				// 可以在这里停止轮询或显示错误
			}
		} catch (error) {
			console.error("轮询任务状态时出错:", error);
			setError("轮询任务状态时发生网络错误");
			setUploading(false);
			setTaskId(null);
			if (pollingIntervalId) clearInterval(pollingIntervalId);
			setPollingIntervalId(null);
		}
	}, [apiBaseUrl, setResult, setError, pollingIntervalId]);
	// --------------------------------------------------

	// 上传处理函数 - 修改为异步
	const handleUpload = async () => {
		if (!videoFile) {
			setError("请先选择一个视频文件");
			return;
		}

		if (modelStatus !== MODEL_STATUS.LOADED) {
			setError('模型尚未加载完成，请稍后重试。');
			return;
		}

		setUploading(true);
		setError(null);
		setResult(null);
		setProgress(0);
		setTaskId(null);
		setAnalysisStatus("idle"); 
		if (pollingIntervalId) {
			clearInterval(pollingIntervalId); 
			setPollingIntervalId(null);
		}

		const formData = new FormData();
		formData.append("file", videoFile);
		formData.append("language", "zh-CN"); 

		// 使用 fetch 进行上传
		try {
			const response = await fetch(`${apiBaseUrl}/upload_video`, {
				method: "POST",
				body: formData,
				// 如果需要进度，fetch本身不直接支持，需要更复杂的实现或库
				// 这里简化处理，上传开始时设置进度为50%
			});

			// 模拟上传进度
			setProgress(50); 

			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.error || `服务器错误: ${response.status}`);
			}

			const data = await response.json();

			if (data.success && data.task_id) {
				setTaskId(data.task_id);
				setAnalysisStatus("processing");
				setError(null);
				setProgress(100); 

				// 开始轮询
				const intervalId = setInterval(() => pollTaskStatus(data.task_id), 3000); 
				setPollingIntervalId(intervalId);
				// 保持 uploading 为 true 直到任务结束
			} else {
				throw new Error(data.error || "启动视频分析失败");
			}

		} catch (error) {
			console.error("上传或启动分析时出错:", error);
			setError(error.message || "上传或启动分析失败");
			setResult(null);
			setUploading(false);
			setTaskId(null);
			setAnalysisStatus("idle");
			setProgress(0);
		}
	};

	// 渲染组件UI
	return (
		<Box sx={{ p: 3 }}>
			{/* 文件选择按钮 */}
			<Button variant='contained' component='label' startIcon={<VideocamIcon />} sx={{ mb: 2 }}>
				选择视频文件
				<input type='file' hidden accept='video/*' onChange={handleFileChange} />
			</Button>

			{/* 显示已选文件名 */}
			{videoFile && <Typography variant='body1' sx={{ mb: 2 }}>已选择: {videoFile.name}</Typography>}

			{/* 上传和分析按钮 */}
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<Button
					variant="contained"
					color="primary"
					startIcon={uploading && analysisStatus === 'processing' ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
					disabled={!videoFile || uploading || modelStatus !== MODEL_STATUS.LOADED}
					onClick={handleUpload}
					sx={{ mt: 2 }}
				>
					{taskId && analysisStatus === 'processing' ? '正在分析...' : '上传并分析'}
				</Button>
			</Box>
			
			{/* 进度条和状态 */} 
			{uploading && (
				<Box sx={{ width: "100%", mt: 2 }}>
					<LinearProgress variant='determinate' value={progress} />
					<Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
						{/* 根据分析状态显示不同文本 */}
						{analysisStatus === 'processing' && taskId ? '视频处理中...' :
						 analysisStatus === 'completed' ? '分析完成！' :
						 analysisStatus === 'failed' ? '分析失败' :
						 progress < 100 ? `${Math.round(progress)}% 上传中...` : '等待服务器处理...'}
					</Typography>
				</Box>
			)}

			{/* 模型未加载提示 */}
			{modelStatus !== MODEL_STATUS.LOADED && (
				<Alert severity="warning" sx={{ mt: 2 }}>
					模型正在加载中，加载完成后即可上传分析。
				</Alert>
			)}
		</Box>
	);
};

export default VideoInput;
