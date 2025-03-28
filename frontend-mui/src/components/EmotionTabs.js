import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import SpeechInput from "./SpeechInput";
import TextInput from "./TextInput";
import VideoInput from "./VideoInput";
import CameraInput from "./CameraInput";
import ResultDisplay from "./ResultDisplay";
import HistoryRecord from "./HistoryRecord";
import MicIcon from '@mui/icons-material/Mic';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import HistoryIcon from '@mui/icons-material/History';

function TabPanel(props) {
	const { children, value, index, ...other } = props;

	return (
		<div role='tabpanel' hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

function a11yProps(index) {
	return {
		id: `simple-tab-${index}`,
		"aria-controls": `simple-tabpanel-${index}`,
	};
}

function EmotionTabs({ modelLoaded, apiBaseUrl, setError }) {
	const [tabValue, setTabValue] = useState(0);
	const [recognizedText, setRecognizedText] = useState("");
	const [emotionResult, setEmotionResult] = useState(null);
	const [showResult, setShowResult] = useState(false);
	const [historyData, setHistoryData] = useState([]);

	// 从localStorage加载历史记录
	useEffect(() => {
		try {
			const savedHistory = localStorage.getItem('emotionAnalysisHistory');
			if (savedHistory) {
				setHistoryData(JSON.parse(savedHistory));
			}
		} catch (error) {
			console.error('加载历史记录失败:', error);
		}
	}, []);

	// 保存历史记录到localStorage
	const saveHistoryToStorage = (history) => {
		try {
			localStorage.setItem('emotionAnalysisHistory', JSON.stringify(history));
		} catch (error) {
			console.error('保存历史记录失败:', error);
		}
	};

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
		// 切换标签时清除结果显示，除非是历史记录标签
		if (newValue !== tabValue && newValue !== 4) {
			setShowResult(false);
		}
	};

	const handleRecognitionResult = data => {
		if (data.success) {
			setRecognizedText(data.text);

			if (data.emotion && data.emotion.success) {
				// 添加时间戳
				const resultWithTimestamp = {
					...data.emotion,
					timestamp: new Date().toISOString()
				};
				
				setEmotionResult(resultWithTimestamp);
				setShowResult(true);
				
				// 添加到历史记录
				const updatedHistory = [resultWithTimestamp, ...historyData].slice(0, 20); // 限制最多20条记录
				setHistoryData(updatedHistory);
				saveHistoryToStorage(updatedHistory);
			}
		} else {
			setError("识别失败: " + data.error);
		}
	};

	const updateEmotionResult = data => {
		// 添加时间戳
		const resultWithTimestamp = {
			...data,
			timestamp: new Date().toISOString()
		};
		
		setEmotionResult(resultWithTimestamp);
		setShowResult(true);
		
		// 添加到历史记录
		const updatedHistory = [resultWithTimestamp, ...historyData].slice(0, 20); // 限制最多20条记录
		setHistoryData(updatedHistory);
		saveHistoryToStorage(updatedHistory);
	};
	
	const handleVideoResult = data => {
		if (data.success) {
			// 设置识别出的文本（如果有）
			if (data.speech_result && data.speech_result.success) {
				setRecognizedText(data.speech_result.text);
			} else {
				setRecognizedText("无法从视频中识别出文本");
			}
			
			// 设置综合情感分析结果
			const combinedEmotionResult = {
				success: true,
				result: data.combined_result,
				video_emotion: data.video_emotion,
				text_emotion: data.text_emotion,
				timestamp: new Date().toISOString(),
				history_data: data.history_data || []
			};
			
			setEmotionResult(combinedEmotionResult);
			setShowResult(true);
			
			// 添加到历史记录
			const updatedHistory = [combinedEmotionResult, ...historyData].slice(0, 20); // 限制最多20条记录
			setHistoryData(updatedHistory);
			saveHistoryToStorage(updatedHistory);
		} else {
			setError("视频分析失败: " + data.error);
		}
	};
	
	// 查看历史记录中的结果
	const handleViewHistoryResult = (item) => {
		setEmotionResult(item);
		setRecognizedText(item.text || "");
		setShowResult(true);
		// 切换到第一个标签以显示结果
		setTabValue(0);
	};
	
	// 清除历史记录
	const handleClearHistory = () => {
		setHistoryData([]);
		saveHistoryToStorage([]);
	};

	return (
		<Box sx={{ width: "100%" }}>
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					aria-label='输入方式选择'
					textColor='primary'
					indicatorColor='primary'
					sx={{
						"& .MuiTab-root": {
							color: "text.secondary",
							"&.Mui-selected": {
								color: "primary.main",
							},
						},
					}}
				>
					<Tab icon={<MicIcon />} label='语音输入' {...a11yProps(0)} />
					<Tab icon={<TextFormatIcon />} label='文本输入' {...a11yProps(1)} />
					<Tab icon={<VideocamIcon />} label='视频分析' {...a11yProps(2)} />
					<Tab icon={<PhotoCameraIcon />} label='摄像头实时分析' {...a11yProps(3)} />
					<Tab icon={<HistoryIcon />} label='历史记录' {...a11yProps(4)} />
				</Tabs>
			</Box>
			<TabPanel value={tabValue} index={0}>
				<SpeechInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} onRecognitionResult={handleRecognitionResult} recognizedText={recognizedText} setError={setError} />
			</TabPanel>
			<TabPanel value={tabValue} index={1}>
				<TextInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} onAnalysisResult={updateEmotionResult} setRecognizedText={setRecognizedText} setError={setError} />
			</TabPanel>
			<TabPanel value={tabValue} index={2}>
				<VideoInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} setResult={handleVideoResult} setError={setError} />
			</TabPanel>
			<TabPanel value={tabValue} index={3}>
				<CameraInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} setResult={handleVideoResult} setError={setError} />
			</TabPanel>
			<TabPanel value={tabValue} index={4}>
				<HistoryRecord 
					historyData={historyData} 
					onViewResult={handleViewHistoryResult} 
					onClearHistory={handleClearHistory} 
				/>
			</TabPanel>

			{showResult && emotionResult && (
				<Box sx={{ p: 3, mt: 2 }}>
					<ResultDisplay emotionResult={emotionResult} recognizedText={recognizedText} />
				</Box>
			)}
		</Box>
	);
}

export default EmotionTabs;
