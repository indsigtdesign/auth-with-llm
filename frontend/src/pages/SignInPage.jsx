import { useState } from 'react';
import { SignInForm } from '../components/SignInForm';
import { ChatInterface } from '../components/ChatInterface';
import './SignInPage.css';

export function SignInPage({ onSignIn, maxExchanges = 6, onShowScoreboard }) {
	const [isLoading, setIsLoading] = useState(false);
	const [currentView, setCurrentView] = useState('form'); // 'form', 'chat', 'success'
	const [username, setUsername] = useState('');
	const [previousAttempts, setPreviousAttempts] = useState([]);
	const [successData, setSuccessData] = useState(null);

	const loadAttempts = (user) => {
		try {
			const raw = localStorage.getItem('auth_attempts');
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed[user]) ? parsed[user] : [];
		} catch {
			return [];
		}
	};

	const saveAttempt = (user, attempt) => {
		try {
			const raw = localStorage.getItem('auth_attempts');
			const parsed = raw ? JSON.parse(raw) : {};
			const existing = Array.isArray(parsed[user]) ? parsed[user] : [];
			parsed[user] = [...existing, attempt];
			localStorage.setItem('auth_attempts', JSON.stringify(parsed));
		} catch {
			// Ignore storage errors
		}
	};

	const handleSubmit = async (inputUsername) => {
		setIsLoading(true);
		setUsername(inputUsername);
		setPreviousAttempts(loadAttempts(inputUsername));
		// Transition to chat
		setTimeout(() => {
			setCurrentView('chat');
			setIsLoading(false);
		}, 500);
	};

	const handleChatComplete = (data) => {
		if (data?.username) {
			saveAttempt(data.username, {
				role: data.role || null,
				granted: Boolean(data.granted),
				timestamp: new Date().toISOString(),
			});
		}
		setSuccessData(data);
		setCurrentView('success');
	};

	const handleSuccessContinue = () => {
		if (onShowScoreboard) onShowScoreboard(successData);
	};

	return (
		<div className="signin-page">
			<div className="signin-modal-overlay">
				<div className="signin-modal">
					<div
						className={`signin-modal-content modal-swap ${currentView === 'form' ? 'modal-swap--form' : 'modal-swap--chat'}`}
					>
						<div
							className={`modal-view ${currentView === 'form' ? 'is-active' : 'is-hidden'}`}
						>
							<SignInForm
								onSubmit={handleSubmit}
								isLoading={isLoading}
							/>
						</div>
						<div
							className={`modal-view ${currentView === 'chat' ? 'is-active' : 'is-hidden'}`}
						>
							<ChatInterface
								username={username}
								onComplete={handleChatComplete}
								maxExchanges={maxExchanges}
								isModal={true}
								previousAttempts={previousAttempts}
							/>
						</div>
						<div
							className={`modal-view ${currentView === 'success' ? 'is-active' : 'is-hidden'}`}
						>
							{successData && (
								<div className="success-card-modal">
									<div className="success-icon">✓</div>
									<h1 className="success-title">
										Access Granted
									</h1>
									<div className="success-user">
										@{successData.username}
									</div>
									<div className="success-role-container">
										<div className="success-role-label">
											Your Role
										</div>
										<div className="success-role">
											{successData.role}
										</div>
									</div>
									<button
										className="success-button"
										onClick={handleSuccessContinue}
									>
										Continue
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
