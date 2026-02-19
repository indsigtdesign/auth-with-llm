import { useState, useEffect } from 'react';
import { SignInPage } from './pages/SignInPage';
import { HighscoresPage } from './pages/HighscoresPage';
import './App.css';

function App() {
	const [currentPage, setCurrentPage] = useState('signin'); // 'signin', 'highscores'
	const [settings, setSettings] = useState(null);
	const [conversationData, setConversationData] = useState(null);
	const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

	useEffect(() => {
		fetch(`${apiBase}/api/settings`)
			.then(async (res) => {
				if (!res.ok) {
					const text = await res.text();
					throw new Error(text || `HTTP ${res.status}`);
				}
				return res.json();
			})
			.then((data) => setSettings(data))
			.catch((err) => console.error('Failed to load settings:', err));
	}, [apiBase]);

	const handleShowScoreboard = (data) => {
		setConversationData(data);
		setCurrentPage('highscores');
	};

	const handleBackFromScoreboard = () => {
		setCurrentPage('signin');
		setConversationData(null);
	};

	return (
		<div className="App">
			{currentPage === 'signin' && (
				<SignInPage
					onShowScoreboard={handleShowScoreboard}
					maxExchanges={settings?.maxExchanges || 6}
				/>
			)}
			{currentPage === 'highscores' && (
				<HighscoresPage
					conversationData={conversationData}
					onBack={handleBackFromScoreboard}
				/>
			)}
		</div>
	);
}

export default App;
