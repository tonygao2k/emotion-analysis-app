import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import SpeechInput from "./SpeechInput";
import TextInput from "./TextInput";
import VideoInput from "./VideoInput";
import CameraInput from "./CameraInput";
import ResultDisplay from "./ResultDisplay";
import MicIcon from '@mui/icons-material/Mic';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

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

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
		// 切换标签时清除结果显示
		if (newValue !== tabValue) {
			setShowResult(false);
		}
	};

	const handleRecognitionResult = data => {
		if (data.success) {
			setRecognizedText(data.text);

			if (data.emotion && data.emotion.success) {
				setEmotionResult(data.emotion);
				setShowResult(true);
			}
		} else {
			setError("识别失败: " + data.error);
		}
	};

	const updateEmotionResult = data => {
		setEmotionResult(data);
		setShowResult(true);
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
				text_emotion: data.text_emotion
			};
			
			setEmotionResult(combinedEmotionResult);
			setShowResult(true);
		} else {
			setError("视频分析失败: " + data.error);
		}
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

			{showResult && emotionResult && (
				<Box sx={{ p: 3, mt: 2 }}>
					<ResultDisplay emotionResult={emotionResult} recognizedText={recognizedText} />
				</Box>
			)}
		</Box>
	);
}

export default EmotionTabs;
