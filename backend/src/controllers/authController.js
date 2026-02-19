import { buildSystemPrompt, getLLMResponse } from '../services/llmService.js';
import {
	addMessage,
	createConversation,
	getConversation,
	incrementExchange,
} from '../utils/conversationStore.js';
import {
	recordScore,
	getUserRank,
	getHighScores as fetchHighScores,
	getUserBestScore,
	saveConversation,
} from '../utils/highScores.js';

const MAX_EXCHANGES = parseInt(process.env.MAX_EXCHANGES) || 6;
const MAX_USERNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 500;

function parseResponse(reply) {
	try {
		// Try to extract JSON from the response
		const jsonMatch = reply.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				message: parsed.message || reply,
				granted: Boolean(parsed.granted),
				role: parsed.role || null,
				vibe_score:
					typeof parsed.vibe_score === 'number'
						? parsed.vibe_score
						: null,
				role_coolness:
					typeof parsed.role_coolness === 'number'
						? parsed.role_coolness
						: null,
			};
		}
	} catch (error) {
		console.warn('Failed to parse JSON response:', error.message);
	}

	// Fallback to old regex parsing
	const match = reply.match(
		/ACCESS GRANTED\s*[.:-]\s*(?:Your\s+)?[Rr]ole:\s*["\']?([^"'\n]+)["\']?/i,
	);
	return {
		message: reply,
		granted: Boolean(match),
		role: match ? match[1].trim() : null,
		vibe_score: null,
		role_coolness: null,
	};
}

export async function initializeAuth(req, res) {
	const { username, previousAttempts = [], llm } = req.body || {};

	if (!username || typeof username !== 'string') {
		return res.status(400).json({ error: 'username is required' });
	}

	if (username.length > MAX_USERNAME_LENGTH) {
		return res.status(400).json({
			error: `username must be ${MAX_USERNAME_LENGTH} characters or less`,
		});
	}

	try {
		const systemPrompt = buildSystemPrompt(
			username,
			previousAttempts,
			0,
			MAX_EXCHANGES,
		);
		const convo = createConversation({ username, systemPrompt });

		const seedMessages = [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content:
					'Start the verification with your first security prompt.',
			},
		];

		const reply = await getLLMResponse(seedMessages, llm);
		addMessage(convo.id, { role: 'assistant', content: reply });

		const parsed = parseResponse(reply);

		return res.json({
			conversationId: convo.id,
			reply: parsed.message,
			exchangeCount: convo.exchangeCount,
			maxExchanges: MAX_EXCHANGES,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}

export async function getHighScores(req, res) {
	try {
		const limit = parseInt(req.query.limit) || 10;
		const username = req.query.username;

		if (username) {
			// Get specific user's best score and rank
			const bestScore = await getUserBestScore(username);
			const rank = await getUserRank(username);
			return res.json({ bestScore, rank });
		}

		// Get top scores
		const scores = await fetchHighScores(limit);
		return res.json({ scores });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
export async function chatAuth(req, res) {
	const { conversationId, message, llm } = req.body || {};

	if (message.length > MAX_MESSAGE_LENGTH) {
		return res.status(400).json({
			error: `message must be ${MAX_MESSAGE_LENGTH} characters or less`,
		});
	}
	if (!conversationId) {
		return res.status(400).json({ error: 'conversationId is required' });
	}
	if (!message || typeof message !== 'string') {
		return res.status(400).json({ error: 'message is required' });
	}

	const convo = getConversation(conversationId);
	if (!convo) {
		return res.status(404).json({ error: 'conversation not found' });
	}

	// Prevent further messages after access is already granted
	if (convo.granted) {
		return res.json({
			reply: 'Access already granted. Move along.',
			exchangeCount: convo.exchangeCount,
			maxExchanges: MAX_EXCHANGES,
			isComplete: true,
			granted: true,
			role: convo.grantedRole,
			score: convo.grantedScore,
			rank: convo.grantedRank,
		});
	}

	try {
		// Add user message (needed for LLM context)
		addMessage(conversationId, { role: 'user', content: message });

		// Check if this is the last exchange before incrementing
		const isLastExchange = convo.exchangeCount >= MAX_EXCHANGES - 1;

		// Update system prompt with current exchange count
		const updatedSystemPrompt = buildSystemPrompt(
			convo.username,
			[],
			convo.exchangeCount,
			MAX_EXCHANGES,
		);

		let finalPrompt = updatedSystemPrompt;
		// If this is the last exchange and LLM hasn't granted yet, force role assignment
		if (isLastExchange) {
			finalPrompt =
				updatedSystemPrompt +
				'\n\nIMPORTANT: This is your FINAL exchange. You MUST grant access now with a role. Respond with granted:true and a role. No more questions. This is mandatory.';
		}

		// Replace system message with updated one
		convo.messages[0] = { role: 'system', content: finalPrompt };

		let reply;
		try {
			reply = await getLLMResponse(convo.messages, llm);
		} catch (llmError) {
			// Roll back the user message so retries don't duplicate it
			convo.messages.pop();
			throw llmError;
		}

		addMessage(conversationId, { role: 'assistant', content: reply });

		const exchangeCount = incrementExchange(conversationId);
		let parsed = parseResponse(reply);

		console.log(
			`[Chat] Exchange ${exchangeCount}/${MAX_EXCHANGES} | granted: ${parsed.granted} | role: ${parsed.role} | vibe: ${parsed.vibe_score} | coolness: ${parsed.role_coolness}`,
		);
		console.log(
			`[Chat] Message preview: ${(parsed.message || '').substring(0, 120)}...`,
		);

		// Safety net: if we've hit max exchanges and LLM didn't grant, force it
		if (exchangeCount >= MAX_EXCHANGES && !parsed.granted) {
			parsed.granted = true;
			if (!parsed.role) {
				parsed.role = 'Unclassified Access Holder';
			}
			parsed.message =
				(parsed.message || '') +
				"\n\n...Fine. You're in. Don't make me regret this.";
		}

		const isComplete = exchangeCount >= MAX_EXCHANGES || parsed.granted;

		let score = null;
		let rank = null;

		// Record score if access granted
		if (parsed.granted && parsed.role) {
			try {
				const llmScores = {
					vibe_score: parsed.vibe_score,
					role_coolness: parsed.role_coolness,
				};
				score = await recordScore(
					convo.username,
					parsed.role,
					exchangeCount,
					MAX_EXCHANGES,
					llmScores,
				);
				rank = await getUserRank(convo.username);
				console.log(
					`Score recorded: ${convo.username} - ${parsed.role} - Score: ${score.totalScore} (vibe: ${score.vibeScore}, role: ${score.roleCoolness}, speed: ${score.exchangeScore})`,
				);

				// Save the complete conversation with score
				await saveConversation(convo.username, parsed.role, convo.messages, score);
			} catch (scoreError) {
				console.error(
					'[Chat] Score recording failed (non-fatal):',
					scoreError.message,
				);
			}

			// Mark conversation as granted so further messages are blocked
			convo.granted = true;
			convo.grantedRole = parsed.role;
			convo.grantedScore = score;
			convo.grantedRank = rank;
		}

		return res.json({
			reply: parsed.message,
			exchangeCount,
			maxExchanges: MAX_EXCHANGES,
			isComplete,
			granted: parsed.granted,
			role: parsed.role,
			score,
			rank,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
}
