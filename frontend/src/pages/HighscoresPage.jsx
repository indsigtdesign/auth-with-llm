import { useState, useEffect } from 'react';
import './HighscoresPage.css';

export function HighscoresPage({ conversationData, onBack }) {
	const [topScores, setTopScores] = useState([]);
	const [userScore, setUserScore] = useState(null);
	const [userRank, setUserRank] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

	useEffect(() => {
		fetchScores();
	}, []);

	const fetchScores = async () => {
		try {
			setIsLoading(true);

			// Fetch top scores
			const topRes = await fetch(
				`${apiBase}/api/auth/highscores?limit=10`,
			);
			if (!topRes.ok) throw new Error('Failed to fetch top scores');
			const topData = await topRes.json();
			setTopScores(topData.scores || []);

			// Fetch user's score if available
			if (conversationData?.username) {
				const userRes = await fetch(
					`${apiBase}/api/auth/highscores?username=${encodeURIComponent(conversationData.username)}`,
				);
				if (userRes.ok) {
					const userData = await userRes.json();
					setUserScore(userData.bestScore);
					setUserRank(userData.rank);
				}
			}
		} catch (err) {
			console.error('Error fetching scores:', err);
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const getMedalEmoji = (rank) => {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return `#${rank}`;
	};

	return (
		<div className="highscores-page">
			<div className="highscores-container">
				<div className="highscores-header">
					<h1>The Bouncer's Hall of Fame</h1>
					<p className="subtitle">
						Excellence in Existential Authentication
					</p>
				</div>

				{/* User's Score Card */}
				{conversationData && (
					<div className="user-score-card">
						<div className="user-score-header">
							<div className="user-info">
								<h2>@{conversationData.username}</h2>
								{userRank && (
									<div className="user-rank">
										Rank: {getMedalEmoji(userRank)} #
										{userRank}
									</div>
								)}
							</div>
						</div>

						{userScore || conversationData.score ? (
							<div className="score-details">
								{/* Use fetched userScore if available, otherwise use conversationData.score */}
								{(() => {
									const score =
										userScore || conversationData.score;
									return (
										<>
											<div className="score-main">
												<span className="score-label">
													Your Score
												</span>
												<span className="score-value">
													{score.score ||
														score.totalScore}
												</span>
											</div>

											<div className="score-breakdown">
												<div className="breakdown-item">
													<span className="breakdown-label">
														Vibe
													</span>
													<div className="breakdown-bar">
														<div
															className="breakdown-fill vibe-fill"
															style={{
																width: `${score.vibe_score || score.vibeScore || 0}%`,
															}}
														></div>
													</div>
													<span className="breakdown-value">
														{score.vibe_score ||
															score.vibeScore ||
															0}
													</span>
												</div>

												<div className="breakdown-item">
													<span className="breakdown-label">
														Role Coolness
													</span>
													<div className="breakdown-bar">
														<div
															className="breakdown-fill"
															style={{
																width: `${score.role_coolness || score.roleCoolness}%`,
															}}
														></div>
													</div>
													<span className="breakdown-value">
														{score.role_coolness ||
															score.roleCoolness}
													</span>
												</div>

												<div className="breakdown-item">
													<span className="breakdown-label">
														Speed Bonus
													</span>
													<div className="breakdown-bar">
														<div
															className="breakdown-fill"
															style={{
																width: `${score.exchange_score || score.exchangeScore}%`,
															}}
														></div>
													</div>
													<span className="breakdown-value">
														{score.exchange_score ||
															score.exchangeScore}
													</span>
												</div>

												<div className="breakdown-item exchanges-used">
													<span className="breakdown-label">
														Exchanges Used
													</span>
													<span className="breakdown-value">
														{score.exchange_count ||
															score.exchangeCount}
													</span>
												</div>
											</div>

											<div className="role-achievement">
												<span className="achievement-label">
													Your Role
												</span>
												<span className="achievement-role">
													{conversationData.role}
												</span>
											</div>
										</>
									);
								})()}
							</div>
						) : (
							<div className="score-placeholder">
								No score recorded yet
							</div>
						)}
					</div>
				)}

				{/* Top Scores Leaderboard */}
				<div className="leaderboard-section">
					<h2>Global Leaderboard</h2>

					{isLoading ? (
						<div className="loading">Loading scores...</div>
					) : error ? (
						<div className="error">Failed to load scores</div>
					) : topScores.length === 0 ? (
						<div className="empty-state">
							<p>No scores yet. Be the first to authenticate!</p>
						</div>
					) : (
						<div className="leaderboard">
							<div className="leaderboard-header">
								<div className="leaderboard-rank">Rank</div>
								<div className="leaderboard-user">User</div>
								<div className="leaderboard-role">Role</div>
								<div className="leaderboard-score">Score</div>
								<div className="leaderboard-vibe">Vibe</div>
								<div className="leaderboard-speed">Speed</div>
							</div>

							<div className="leaderboard-rows">
								{topScores.map((entry, idx) => (
									<div
										key={idx}
										className={`leaderboard-row ${
											userScore &&
											entry.username ===
												userScore.username
												? 'is-current-user'
												: ''
										}`}
									>
										<div className="leaderboard-rank">
											{getMedalEmoji(idx + 1)}
										</div>
										<div className="leaderboard-user">
											@{entry.username}
										</div>
										<div className="leaderboard-role">
											{entry.role}
										</div>
										<div className="leaderboard-score">
											<strong>{entry.score}</strong>
										</div>
										<div className="leaderboard-vibe">
											{entry.vibe_score ?? '—'}
										</div>
										<div className="leaderboard-speed">
											{entry.exchange_count} exchanges
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<button className="back-button" onClick={onBack}>
					← Back to Sign In
				</button>
			</div>
		</div>
	);
}
