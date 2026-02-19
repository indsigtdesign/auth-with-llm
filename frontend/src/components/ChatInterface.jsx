import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatInterface.css';

export function ChatInterface({
	username,
	onComplete,
	maxExchanges = 6,
	isModal = false,
	previousAttempts = [],
	llm,
}) {
	const [messages, setMessages] = useState([]);
	const [userInput, setUserInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isInitializing, setIsInitializing] = useState(false);
	const [initError, setInitError] = useState('');
	const [exchangeCount, setExchangeCount] = useState(0);
	const [cardIndex, setCardIndex] = useState(0);
	const [conversationId, setConversationId] = useState(null);
	const [completionData, setCompletionData] = useState(null);
	const touchStartX = useRef(null);
	const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

	const prompts = useMemo(
		() => messages.filter((msg) => msg.type !== 'user'),
		[messages],
	);
	const responses = useMemo(
		() => messages.filter((msg) => msg.type === 'user'),
		[messages],
	);

	const displayPrompts = useMemo(() => {
		if (prompts.length > 0) return prompts;
		return [
			{
				id: 'placeholder',
				type: 'assistant',
				content: isInitializing
					? 'Preparing your security prompt...'
					: initError || 'No prompt available yet.',
				isPlaceholder: true,
			},
		];
	}, [prompts, isInitializing, initError]);

	const totalCards = displayPrompts.length;
	const safeIndex = Math.max(0, Math.min(cardIndex, totalCards - 1));

	useEffect(() => {
		setCardIndex(totalCards - 1);
	}, [totalCards]);

	const handlePrev = () => {
		if (totalCards <= 1) return;
		setCardIndex((prev) => Math.max(prev - 1, 0));
	};

	const handleNext = () => {
		if (totalCards <= 1) return;
		setCardIndex((prev) => Math.min(prev + 1, totalCards - 1));
	};

	const handlePointerDown = (e) => {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		touchStartX.current = e.clientX;
	};

	const handlePointerUp = (e) => {
		if (touchStartX.current === null || totalCards <= 1) return;
		const delta = e.clientX - touchStartX.current;
		const threshold = 40;
		if (delta > threshold) handlePrev();
		if (delta < -threshold) handleNext();
		touchStartX.current = null;
	};

	const initializeConversation = async () => {
		if (!username) return;
		setIsInitializing(true);
		setInitError('');
		try {
			const response = await fetch(`${apiBase}/api/auth/initialize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username,
					previousAttempts,
					llm,
				}),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `HTTP ${response.status}`);
			}

			const data = await response.json();
			setConversationId(data.conversationId);
			setExchangeCount(data.exchangeCount || 0);
			setMessages([
				{
					id: Date.now(),
					type: 'assistant',
					content: data.reply,
				},
			]);
		} catch (error) {
			setInitError(error.message || 'Failed to initialize');
		} finally {
			setIsInitializing(false);
		}
	};

	useEffect(() => {
		initializeConversation();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [username]);

	const handleSendMessage = async (e) => {
		e.preventDefault();
		if (!userInput.trim() || isLoading || !conversationId) return;

		const userMessage = {
			id: Date.now() + Math.random(),
			type: 'user',
			content: userInput.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setUserInput('');
		setIsLoading(true);

		try {
			const response = await fetch(`${apiBase}/api/auth/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId,
					message: userMessage.content,
					llm,
				}),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `HTTP ${response.status}`);
			}

			const data = await response.json();
			const assistantMessage = {
				id: Date.now() + Math.random(),
				type: 'assistant',
				content: data.reply,
			};

			setMessages((prev) => [...prev, assistantMessage]);
			setExchangeCount(data.exchangeCount || exchangeCount);

			if (data.isComplete) {
				setCompletionData({
					username,
					role: data.role,
					granted: data.granted,
					conversationId,
					messages: [...messages, userMessage, assistantMessage],
				});
			}
		} catch (error) {
			setMessages((prev) => [
				...prev,
				{
					id: Date.now() + Math.random(),
					type: 'assistant',
					content:
						'Something went wrong while fetching the next prompt. Please try again.',
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={`chat-container ${isModal ? 'chat-modal' : ''}`}>
			<div className="chat-header">
				<div className="chat-header-content">
					<h2>Identity Verification</h2>
					<p className="chat-username">@{username}</p>
				</div>
			</div>

			<div className="qa-body">
				<div
					className="carousel"
					onPointerDown={handlePointerDown}
					onPointerUp={handlePointerUp}
				>
					<div
						className="carousel-track"
						style={{
							transform: `translateX(-${safeIndex * 100}%)`,
						}}
					>
						{displayPrompts.map((prompt, idx) => {
							const response = responses[idx];
							const isActive = idx === safeIndex;
							return (
								<div key={prompt.id} className="carousel-card">
									<div className="question-card">
										<div className="question-label">
											Security Prompt
										</div>
										<div className="question-text">
											<ReactMarkdown>
												{prompt.content}
											</ReactMarkdown>
										</div>

										{prompt.isPlaceholder ? (
											<div className="answered-block">
												<div className="answered-label">
													Status
												</div>
												<div className="answered-text">
													<ReactMarkdown>
														{prompt.content}
													</ReactMarkdown>
												</div>
												{initError && (
													<button
														type="button"
														className="response-nav-button"
														onClick={
															initializeConversation
														}
													>
														Retry
													</button>
												)}
											</div>
										) : response ? (
											<div className="answered-block">
												<div className="answered-label">
													Your Response
												</div>
												<div className="answered-text">
													<ReactMarkdown>
														{response.content}
													</ReactMarkdown>
												</div>
											</div>
										) : (
											isActive &&
											!completionData && (
												<form
													onSubmit={handleSendMessage}
													className="question-form"
												>
													<label
														htmlFor="security-response"
														className="question-input-label"
													>
														Your Response
													</label>
													<div className="question-input-row">
														<input
															id="security-response"
															type="text"
															value={userInput}
															onChange={(e) =>
																setUserInput(
																	e.target
																		.value,
																)
															}
															placeholder="Type your response"
															disabled={isLoading}
															className="question-input"
															autoComplete="off"
															spellCheck="false"
														/>
													</div>
													<button
														type="submit"
														disabled={
															isLoading ||
															!userInput.trim()
														}
														className="question-submit"
													>
														{isLoading ? (
															<span className="send-spinner"></span>
														) : (
															<span className="send-label">
																Submit
															</span>
														)}
													</button>
												</form>
											)
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{completionData ? (
					<div className="completion-actions">
						<button
							type="button"
							className="continue-button"
							onClick={() => onComplete(completionData)}
						>
							Continue
						</button>
					</div>
				) : totalCards > 1 ? (
					<div className="carousel-nav">
						<button
							type="button"
							className="response-nav-button"
							onClick={handlePrev}
							disabled={safeIndex === 0}
						>
							Prev
						</button>
						<div className="response-meta">
							{safeIndex + 1} of {totalCards}
						</div>
						<button
							type="button"
							className="response-nav-button"
							onClick={handleNext}
							disabled={safeIndex === totalCards - 1}
						>
							Next
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
