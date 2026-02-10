import React, { useState, useRef, useEffect } from "react";
import { IoMic, IoClose, IoCheckmark, IoAdd } from "react-icons/io5";
import { getAzureEndpoint, getAzureApiVersion, getAzureApiKey } from "../../../utils/apiKeyEncryption";

/**
 * VoiceInput Component
 * 
 * Captures audio from the user's microphone and converts it to text
 * using OpenAI's Whisper API.
 */
const VoiceInput = ({ onTranscript, onError, disabled = false, onStateChange }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [hasRecorded, setHasRecorded] = useState(false); // Track if we have recorded audio
	const [recordingDuration, setRecordingDuration] = useState(0); // Current chunk duration
	const [totalRecordingDuration, setTotalRecordingDuration] = useState(0); // Total duration across all chunks
	const [audioLevels, setAudioLevels] = useState([]);
	const [hasTranscript, setHasTranscript] = useState(false);
	const [pendingTranscript, setPendingTranscript] = useState("");
	const [reachedLimit, setReachedLimit] = useState(false); // Track if 2-minute limit reached
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const streamRef = useRef(null);
	const audioContextRef = useRef(null);
	const analyserRef = useRef(null);
	const animationFrameRef = useRef(null);
	const durationIntervalRef = useRef(null);
	
	const MAX_RECORDING_TIME = 120; // 2 minutes in seconds

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopRecording();
			cleanupAudioContext();
		};
	}, []);

	// Cleanup audio context
	const cleanupAudioContext = () => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			audioContextRef.current.close();
		}
		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
		}
	};

	/**
	 * Start recording audio with waveform visualization
	 */
	const startRecording = async () => {
		try {
			// Validate Azure OpenAI configuration before starting
			const azureEndpoint = getAzureEndpoint();
			const azureApiKey = getAzureApiKey();
			if (!azureEndpoint || !azureApiKey || azureApiKey.trim() === "") {
				throw new Error("Azure OpenAI configuration not found. Please check your .env file.");
			}

			// Check if microphone is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				throw new Error("Your browser does not support microphone access.");
			}

			// Request microphone access
			const stream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				}
			});
			streamRef.current = stream;

			// Set up audio context for waveform visualization
			const audioContext = new (window.AudioContext || window.webkitAudioContext)();
			audioContextRef.current = audioContext;
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.8;
			source.connect(analyser);
			analyserRef.current = analyser;

			// Start waveform animation
			startWaveformAnimation();

			// Create MediaRecorder
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: "audio/webm;codecs=opus",
			});

			mediaRecorderRef.current = mediaRecorder;
			// Don't clear audioChunksRef if continuing recording
			if (!reachedLimit) {
				audioChunksRef.current = [];
				setTotalRecordingDuration(0);
			}
			setRecordingDuration(0);
			setReachedLimit(false);
			setHasTranscript(false);
			setPendingTranscript("");

			// Handle data available
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			// Handle recording stop
			mediaRecorder.onstop = async () => {
				cleanupAudioContext();
				setHasRecorded(true);
				// Don't auto-process, wait for user to accept
			};

			// Start recording
			mediaRecorder.start(100);
			setIsRecording(true);

			// Start duration timer
			durationIntervalRef.current = setInterval(() => {
				setRecordingDuration((prev) => {
					const newDuration = prev + 1;
					
					// Check if current chunk reached 2-minute limit
					if (newDuration >= MAX_RECORDING_TIME) {
						// Auto-pause when limit is reached
						setReachedLimit(true);
						// Update total duration before stopping
						setTotalRecordingDuration((prevTotal) => prevTotal + MAX_RECORDING_TIME);
						stopRecording();
						return MAX_RECORDING_TIME;
					}
					
					return newDuration;
				});
			}, 1000);

		} catch (error) {
			console.error("Error starting recording:", error);
			cleanupAudioContext();
			if (onError) {
				let errorMessage = "Failed to start recording. Please try again.";
				if (error.name === "NotAllowedError") {
					errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
				} else if (error.name === "NotFoundError") {
					errorMessage = "No microphone found. Please connect a microphone and try again.";
				} else if (error.name === "NotReadableError") {
					errorMessage = "Microphone is being used by another application. Please close other apps and try again.";
				} else if (error.message) {
					errorMessage = error.message;
				}
				onError(errorMessage);
			}
		}
	};

	/**
	 * Start waveform animation
	 */
	const startWaveformAnimation = () => {
		const analyser = analyserRef.current;
		if (!analyser) return;

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const updateWaveform = () => {
			if (!isRecording) {
				// Keep last waveform visible when recording stops
				return;
			}

			analyser.getByteFrequencyData(dataArray);
			
			// Normalize and create waveform bars (20 bars)
			const bars = 20;
			const step = Math.floor(bufferLength / bars);
			const levels = [];
			
			for (let i = 0; i < bars; i++) {
				let sum = 0;
				for (let j = 0; j < step; j++) {
					sum += dataArray[i * step + j];
				}
				const average = sum / step;
				// Normalize to 0-100
				levels.push(Math.min(100, (average / 255) * 100));
			}
			
			setAudioLevels(levels);
			animationFrameRef.current = requestAnimationFrame(updateWaveform);
		};

		updateWaveform();
	};

	/**
	 * Stop recording audio
	 */
	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		}

		// Stop all tracks
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		cleanupAudioContext();
		setAudioLevels([]);
		
		// Clear duration interval
		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
			durationIntervalRef.current = null;
		}
		// Note: Total duration is updated in the interval when limit is reached
		// or will be updated when user accepts the recording
	};

	/**
	 * Continue recording after limit reached
	 */
	const continueRecording = async () => {
		setReachedLimit(false);
		setRecordingDuration(0);
		// Keep audio chunks from previous recording
		// Don't reset totalRecordingDuration - it's already updated
		await startRecording();
	};

	/**
	 * Cancel recording
	 */
	const cancelRecording = (e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		// Reset all states immediately
		setIsRecording(false);
		setIsProcessing(false);
		setHasRecorded(false);
		setHasTranscript(false);
		setPendingTranscript("");
		setRecordingDuration(0);
		setTotalRecordingDuration(0);
		setReachedLimit(false);
		setAudioLevels([]);
		
		// Stop recording and cleanup
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			try {
				mediaRecorderRef.current.stop();
			} catch (err) {
				// Ignore errors if already stopped
			}
		}

		// Stop all tracks
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		cleanupAudioContext();
		audioChunksRef.current = [];
		
		// Notify parent immediately
		if (onStateChange) {
			onStateChange(false);
		}
	};

	/**
	 * Accept and process the recording
	 */
	const acceptRecording = async () => {
		if (audioChunksRef.current.length === 0) {
			if (onError) {
				onError("No audio recorded. Please try again.");
			}
			return;
		}
		stopRecording();
		await processAudio();
	};

	/**
	 * Process recorded audio and send to OpenAI Whisper API
	 */
	const processAudio = async () => {
		if (audioChunksRef.current.length === 0) {
			if (onError) {
				onError("No audio recorded. Please try again.");
			}
			return;
		}

		// Validate minimum recording duration (0.5 seconds)
		const totalDuration = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
		if (totalDuration < 1000) {
			if (onError) {
				onError("Recording too short. Please record at least 0.5 seconds.");
			}
			return;
		}

		setIsProcessing(true);

		try {
			// Combine audio chunks into a single blob
			const audioBlob = new Blob(audioChunksRef.current, {
				type: "audio/webm;codecs=opus",
			});

			// Validate blob size (max 25MB for OpenAI)
			if (audioBlob.size > 25 * 1024 * 1024) {
				throw new Error("Audio file too large. Maximum size is 25MB.");
			}

			// Convert to File for FormData
			const audioFile = new File([audioBlob], "recording.webm", {
				type: "audio/webm;codecs=opus",
			});

			// Get Azure OpenAI configuration
			const azureEndpoint = getAzureEndpoint();
			const azureApiVersion = getAzureApiVersion();
			const azureApiKey = getAzureApiKey();
			
			if (!azureEndpoint || !azureApiKey || azureApiKey.trim() === "") {
				throw new Error("Azure OpenAI configuration not found. Please check your .env file.");
			}

			// Create FormData
			const formData = new FormData();
			formData.append("file", audioFile);
			formData.append("model", "whisper");
			formData.append("response_format", "verbose_json");
			formData.append("language", "en"); // Force English language transcription

			// Build Azure OpenAI transcription URL
			const transcriptionUrl = `${azureEndpoint}/openai/deployments/whisper/audio/transcriptions?api-version=${azureApiVersion}`;

			// Send to Azure OpenAI API with timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

			const response = await fetch(transcriptionUrl, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${azureApiKey}`,
				},
				body: formData,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				let errorMessage = `API error: ${response.statusText}`;
				
				if (errorData.error) {
					if (errorData.error.message) {
						errorMessage = errorData.error.message;
					} else if (errorData.error.code === "invalid_api_key" || errorData.error.code === "401") {
						errorMessage = "Invalid Azure OpenAI API key. Please check your .env file.";
					} else if (errorData.error.code === "rate_limit_exceeded") {
						errorMessage = "Rate limit exceeded. Please try again in a moment.";
					}
				}
				
				throw new Error(errorMessage);
			}

			const data = await response.json();
			const transcript = data.text?.trim();

			if (transcript) {
				setPendingTranscript(transcript);
				setHasTranscript(true);
				if (onTranscript) {
					onTranscript(transcript);
				}
			} else {
				throw new Error("No transcript received from API. Please try again.");
			}
		} catch (error) {
			console.error("Error processing audio:", error);
			if (onError) {
				let errorMessage = "Failed to process audio. Please try again.";
				if (error.name === "AbortError") {
					errorMessage = "Request timed out. Please try again.";
				} else if (error.message) {
					errorMessage = error.message;
				}
				onError(errorMessage);
			}
			} finally {
			setIsProcessing(false);
			setHasRecorded(false);
			audioChunksRef.current = [];
		}
	};

	/**
	 * Format duration in MM:SS format
	 */
	const formatDuration = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Notify parent component of state changes
	useEffect(() => {
		if (onStateChange) {
			const isActive = isRecording || isProcessing || hasRecorded;
			onStateChange(isActive);
		}
	}, [isRecording, isProcessing, hasRecorded, onStateChange]);

	// If recording, processing, has recorded audio, or reached limit, show expanded UI
	if (isRecording || isProcessing || hasRecorded || reachedLimit) {
		return (
			<div className="mas-voice-input-expanded">
				<div className="mas-voice-waveform-container">
					{isProcessing ? (
						<div className="mas-voice-processing">
							<div className="mas-voice-processing-spinner"></div>
							<span>Processing audio...</span>
						</div>
					) : audioLevels.length > 0 ? (
						<>
							<div className="mas-voice-waveform">
								{audioLevels.map((level, index) => (
									<div
										key={index}
										className="mas-voice-waveform-bar"
										style={{
											height: `${Math.max(10, level)}%`,
											animationDelay: `${index * 0.05}s`,
										}}
									/>
								))}
							</div>
							{isRecording && (
								<div className="mas-voice-duration">
									<div>
										{formatDuration(recordingDuration)} / {formatDuration(MAX_RECORDING_TIME)}
									</div>
									{totalRecordingDuration > 0 && (
										<span className="mas-voice-total-duration">
											Total: {formatDuration(totalRecordingDuration + recordingDuration)}
										</span>
									)}
								</div>
							)}
							{reachedLimit && !isRecording && (
								<div className="mas-voice-limit-reached">
									<span>2-minute limit reached</span>
									<button
										className="mas-voice-say-more-btn"
										onClick={continueRecording}
										title="Continue recording for another 2 minutes"
									>
										<IoAdd size={16} />
										Say More
									</button>
								</div>
							)}
						</>
					) : (
						<div className="mas-voice-ready">
							<span>Ready to process</span>
						</div>
					)}
				</div>
				<div className="mas-voice-actions">
					<button
						className="mas-voice-action-btn mas-voice-cancel-btn"
						onClick={cancelRecording}
						disabled={isProcessing}
						title="Cancel"
					>
						<IoClose size={20} />
					</button>
					{!isProcessing && (
						<button
							className="mas-voice-action-btn mas-voice-accept-btn"
							onClick={acceptRecording}
							title="Accept and transcribe"
						>
							<IoCheckmark size={20} />
						</button>
					)}
				</div>
			</div>
		);
	}

	// Default state: show microphone button
	return (
		<button
			className="mas-voice-input-button"
			onClick={startRecording}
			disabled={disabled}
			title="Start voice input"
		>
			<IoMic size={18} />
		</button>
	);
};

export default VoiceInput;

