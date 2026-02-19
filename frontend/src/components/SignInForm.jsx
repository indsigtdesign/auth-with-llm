import { useState } from 'react';
import './SignInForm.css';

export function SignInForm({ onSubmit, isLoading = false }) {
	const [username, setUsername] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();

		if (!username.trim()) {
			setError('Please enter a username');
			return;
		}

		setError('');
		onSubmit(username.trim());
	};

	return (
		<div className="signin-panel">
			<div className="signin-header">
				<h1>Welcome Back</h1>
				<p className="signin-subtitle">Please provide your username</p>
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
					<label htmlFor="user_cred" className="form-label">
						Username
					</label>
					<input
						id="user_cred"
						name="cred_access"
						type="text"
						className="form-input"
						placeholder="Enter credentials"
						value={username}
						onChange={(e) => {
							setUsername(e.target.value);
							setError('');
						}}
						disabled={isLoading}
						autoComplete="off"
						autoFocus
					/>
					{error && <span className="form-error">{error}</span>}
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
	);
}
