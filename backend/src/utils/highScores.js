import { supabase } from './supabase.js';

const TABLE_NAME = 'high_scores';

// Fallback role coolness heuristic (used when LLM doesn't provide a score)
function calculateRoleCoolnessFallback(role) {
	if (!role) return 0;

	let coolness = 40; // Base score (lower than before)

	const wordCount = role.split(' ').length;
	coolness += Math.min(wordCount * 5, 15);

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
	if (hasCreative) coolness += 10;

	const satiricalPatterns =
		/of |for |the |and |uber|hyper|meta|quantum|chaos|void|shadow/i;
	if (satiricalPatterns.test(role)) coolness += 5;

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
// llmScores: { vibe_score, role_coolness } from LLM (optional)
export function calculateScore(
	username,
	role,
	exchangeCount,
	maxExchanges,
	llmScores = {},
) {
	// Use LLM-provided scores if available, otherwise fallback
	const roleCoolness =
		typeof llmScores.role_coolness === 'number'
			? Math.max(0, Math.min(100, llmScores.role_coolness))
			: calculateRoleCoolnessFallback(role);
	const vibeScore =
		typeof llmScores.vibe_score === 'number'
			? Math.max(0, Math.min(100, llmScores.vibe_score))
			: 50; // Default mid vibe if LLM didn't provide
	const exchangeScore = calculateExchangeScore(exchangeCount, maxExchanges);

	// Weighted: 25% role coolness, 35% vibe, 40% exchange speed
	const totalScore = Math.round(
		roleCoolness * 0.25 + vibeScore * 0.35 + exchangeScore * 0.4,
	);

	return {
		totalScore,
		roleCoolness,
		vibeScore,
		exchangeScore,
		exchangeCount,
	};
}

// Record a new high score
export async function recordScore(
	username,
	role,
	exchangeCount,
	maxExchanges,
	llmScores = {},
) {
	const scoreData = calculateScore(
		username,
		role,
		exchangeCount,
		maxExchanges,
		llmScores,
	);

	if (!supabase) {
		console.warn('Supabase not configured – skipping score recording');
		return scoreData;
	}

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
					vibe_score: scoreData.vibeScore,
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
				vibe_score: scoreData.vibeScore,
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
	if (!supabase) return [];
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
	if (!supabase) return null;
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
	if (!supabase) return null;
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

// Save conversation with score
export async function saveConversation(username, role, messages, scoreData) {
	if (!supabase) {
		console.warn('Supabase not configured – skipping conversation save');
		return null;
	}

	try {
		const conversationRecord = await supabase.from('auth_conversations').insert({
			username,
			role,
			messages,
			total_score: scoreData.totalScore,
			role_coolness: scoreData.roleCoolness,
			vibe_score: scoreData.vibeScore,
			exchange_score: scoreData.exchangeScore,
			exchange_count: scoreData.exchangeCount,
			created_at: new Date().toISOString(),
		});

		if (conversationRecord.error) throw conversationRecord.error;

		console.log(
			`Conversation saved: ${username} - ${role} - ${messages.length} messages`,
		);
		return conversationRecord.data;
	} catch (error) {
		console.error('Error saving conversation:', error.message);
		// Non-fatal error – don't throw, just log
		return null;
	}
}
