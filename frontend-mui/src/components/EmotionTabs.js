import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import SpeechInput from "./SpeechInput";
import TextInput from "./TextInput";
import ResultDisplay from "./ResultDisplay";

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
					<Tab label='语音输入' {...a11yProps(0)} />
					<Tab label='文本输入' {...a11yProps(1)} />
				</Tabs>
			</Box>
			<TabPanel value={tabValue} index={0}>
				<SpeechInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} onRecognitionResult={handleRecognitionResult} recognizedText={recognizedText} setError={setError} />
			</TabPanel>
			<TabPanel value={tabValue} index={1}>
				<TextInput modelLoaded={modelLoaded} apiBaseUrl={apiBaseUrl} onAnalysisResult={updateEmotionResult} setRecognizedText={setRecognizedText} setError={setError} />
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
