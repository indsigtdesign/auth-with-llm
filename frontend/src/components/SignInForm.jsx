import { useState } from 'react';
import './SignInForm.css';

const MAX_USERNAME_LENGTH = 50;

export function SignInForm({ onSubmit, isLoading = false }) {
	const [username, setUsername] = useState('');
	const [error, setError] = useState('');
	const [isFlipped, setIsFlipped] = useState(false);

	const charLength = username.length;
	const percentFull = (charLength / MAX_USERNAME_LENGTH) * 100;
	const isWarning = percentFull >= 70;
	const charsRemaining = MAX_USERNAME_LENGTH - charLength;

	const getWarningMessage = () => {
		if (percentFull >= 95)
			return "Whoa there, wordsmith! You're almost out of space.";
		if (percentFull >= 85)
			return 'Getting chatty, are we? Space is running out.';
		return `Only ${charsRemaining} characters left to stay mysterious.`;
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		if (!username.trim()) {
			setError('Please enter a username');
			return;
		}

		if (username.length > MAX_USERNAME_LENGTH) {
			setError(
				`Username must be ${MAX_USERNAME_LENGTH} characters or less`,
			);
			return;
		}

		setError('');
		onSubmit(username.trim());
	};

	return (
		<div className={`flip-container ${isFlipped ? 'flipped' : ''}`}>
			<div className="flip-front">
				<div className="signin-panel">
					<div className="signin-header">
						<button
							className="chat-info-button"
							onClick={() => setIsFlipped(true)}
							aria-label="Show project information"
							title="What is this?"
						>
							?
						</button>
						<h1 className="signin-title">Welcome Back</h1>
						<p className="signin-subtitle">
							Please provide your username.
						</p>
						<p className="signin-subtitle">
							We’ll take it from there.
						</p>
					</div>

					<form
						onSubmit={handleSubmit}
						className="signin-form"
						autoComplete="off"
					>
						{/* Hidden input to trap Safari's autofill */}
						<input
							autoComplete="username"
							style={{
								position: 'absolute',
								opacity: 0,
								height: 0,
								width: 0,
								pointerEvents: 'none',
							}}
						/>

						<div className="form-group">
							<input
								id="user_cred"
								name="cred_access"
								type="text"
								className={`form-input ${isWarning ? 'input-warning' : ''}`}
								placeholder="Username"
								value={username}
								onChange={(e) => {
									setUsername(e.target.value);
									setError('');
								}}
								maxLength={MAX_USERNAME_LENGTH}
								disabled={isLoading}
								autoComplete="off"
								autoFocus
							/>
							{isWarning && !error && (
								<div className="char-warning">
									<span className="char-warning-text">
										{getWarningMessage()}
									</span>
									<div className="char-bar">
										<div
											className="char-bar-fill"
											style={{ width: `${percentFull}%` }}
										></div>
									</div>
								</div>
							)}
							{error && (
								<span className="form-error">{error}</span>
							)}
						</div>

						<button
							type="submit"
							className="submit-button"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<span className="spinner"></span>
									Signing in...
								</>
							) : (
								'Sign In'
							)}
						</button>
					</form>
				</div>
			</div>
			<div className="flip-back">
				<button
					className="flip-back-close"
					onClick={() => setIsFlipped(false)}
					aria-label="Back to chat"
				>
					←
				</button>
				<div className="project-info">
					<h2>Auth with LLM</h2>
					<p>
						Forget passwords. Forget 2FA. Forget actual security.
						Our new authentication system replaces your login screen
						with a judgmental, overworked LLM that decides if you're
						"worthy" based on vibes, excuses, and how much corporate
						jargon you use.
					</p>
				</div>
			</div>
		</div>
	);
}
