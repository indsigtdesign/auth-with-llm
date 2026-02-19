import { supabase } from './supabase.js';

const TABLE_NAME = 'high_scores';

// Calculate role coolness (1-100)
// Based on: word count, uniqueness, creativity indicators
function calculateRoleCoolness(role) {
	if (!role) return 0;

	let coolness = 50; // Base score

	// Longer, more creative roles score higher
	const wordCount = role.split(' ').length;
	coolness += Math.min(wordCount * 10, 20); // Max +20 for multi-word roles

	// Bonus for creative/technical words
	const creativityIndicators = [
		'manager',
		'officer',
		'consultant',
		'architect',
		'engineer',
		'chief',
		'director',
		'ghost',
		'rebel',
		'master',
		'wizard',
	];
	const hasCreative = creativityIndicators.some((word) =>
		role.toLowerCase().includes(word),
	);
	if (hasCreative) coolness += 15;

	// Bonus for absurdist/satirical elements
	const satiricalPatterns =
		/of |for |the |and |uber|hyper|meta|quantum|chaos|void|shadow/i;
	if (satiricalPatterns.test(role)) coolness += 10;

	return Math.min(coolness, 100);
}

// Calculate exchange efficiency score (1-100)
// Fewer exchanges = higher score
function calculateExchangeScore(exchangeCount, maxExchanges) {
	if (exchangeCount <= 2) return 100; // Perfect: got it in 2 or fewer
	if (exchangeCount <= 3) return 85; // Great: in 3
	if (exchangeCount <= 4) return 70; // Good: in 4
	if (exchangeCount <= 5) return 50; // OK: in 5
	return 30; // Struggled: took 6+
}

// Calculate total score
export function calculateScore(username, role, exchangeCount, maxExchanges) {
	const roleCoolness = calculateRoleCoolness(role);
	const exchangeScore = calculateExchangeScore(exchangeCount, maxExchanges);

	// Weighted average: 60% role coolness, 40% exchange efficiency
	const totalScore = Math.round(roleCoolness * 0.6 + exchangeScore * 0.4);

	return {
		totalScore,
		roleCoolness,
		exchangeScore,
		exchangeCount,
	};
}

// Record a new high score
export async function recordScore(username, role, exchangeCount, maxExchanges) {
	const scoreData = calculateScore(
		username,
		role,
		exchangeCount,
		maxExchanges,
	);

	try {
		// Check if user already has this exact role (avoid duplicates)
		const { data: existing } = await supabase
			.from(TABLE_NAME)
			.select('id, score')
			.eq('username', username)
			.eq('role', role)
			.single();

		if (existing && scoreData.totalScore > existing.score) {
			// Update if new score is better
			await supabase
				.from(TABLE_NAME)
				.update({
					score: scoreData.totalScore,
					role_coolness: scoreData.roleCoolness,
					exchange_score: scoreData.exchangeScore,
					exchange_count: scoreData.exchangeCount,
					created_at: new Date(),
				})
				.eq('id', existing.id);
		} else if (!existing) {
			// Insert new entry
			await supabase.from(TABLE_NAME).insert({
				username,
				role,
				score: scoreData.totalScore,
				role_coolness: scoreData.roleCoolness,
				exchange_score: scoreData.exchangeScore,
				exchange_count: scoreData.exchangeCount,
				created_at: new Date(),
			});
		}

		console.log(
			`Score recorded: ${username} - ${role} - Score: ${scoreData.totalScore}`,
		);
		return scoreData;
	} catch (error) {
		console.error('Error recording score:', error.message);
		throw error;
	}
}

// Get high scores
export async function getHighScores(limit = 10) {
	try {
		const { data, error } = await supabase
			.from(TABLE_NAME)
			.select('*')
			.order('score', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	} catch (error) {
		console.error('Error fetching high scores:', error.message);
		return [];
	}
}

// Get user's best score
export async function getUserBestScore(username) {
	try {
		const { data, error } = await supabase
			.from(TABLE_NAME)
			.select('*')
			.eq('username', username)
			.order('score', { ascending: false })
			.limit(1)
			.single();

		if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
		return data || null;
	} catch (error) {
		console.error('Error fetching user best score:', error.message);
		return null;
	}
}

// Get user's rank
export async function getUserRank(username) {
	try {
		// Get all scores and find rank
		const { data, error } = await supabase
			.from(TABLE_NAME)
			.select('username, score')
			.order('score', { ascending: false });

		if (error) throw error;

		// Get unique users (only their best score)
		const uniqueUsers = [];
		const seenUsernames = new Set();

		for (const entry of data) {
			if (!seenUsernames.has(entry.username)) {
				uniqueUsers.push(entry);
				seenUsernames.add(entry.username);
			}
		}

		const rankIndex = uniqueUsers.findIndex((u) => u.username === username);
		return rankIndex !== -1 ? rankIndex + 1 : null;
	} catch (error) {
		console.error('Error fetching user rank:', error.message);
		return null;
	}
}
