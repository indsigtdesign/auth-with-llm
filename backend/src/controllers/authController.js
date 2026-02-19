import { buildSystemPrompt, getLLMResponse } from '../services/llmService.js';
import {
	addMessage,
	createConversation,
	getConversation,
	incrementExchange,
} from '../utils/conversationStore.js';
import { recordScore, getUserRank, getHighScores as fetchHighScores, getUserBestScore } from '../utils/highScores.js';

const MAX_EXCHANGES = parseInt(process.env.MAX_EXCHANGES) || 6;

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
	};
}

export async function initializeAuth(req, res) {
	const { username, previousAttempts = [], llm } = req.body || {};

	if (!username || typeof username !== 'string') {
		return res.status(400).json({ error: 'username is required' });
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

	try {
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
				'\n\nIMPORTANT: This is your FINAL exchange. You MUST make a decision and grant access with a role. No more questions.';
		}

		// Replace system message with updated one
		convo.messages[0] = { role: 'system', content: finalPrompt };

		const reply = await getLLMResponse(convo.messages, llm);
		addMessage(conversationId, { role: 'assistant', content: reply });

		const exchangeCount = incrementExchange(conversationId);
		const parsed = parseResponse(reply);
		const isComplete = exchangeCount >= MAX_EXCHANGES || parsed.granted;

		let score = null;
		let rank = null;

		// Record score if access granted
		if (parsed.granted && parsed.role) {
			score = await recordScore(
				convo.username,
				parsed.role,
				exchangeCount,
				MAX_EXCHANGES,
			);
			rank = await getUserRank(convo.username);
			console.log(`Score recorded: ${convo.username} - ${parsed.role} - Score: ${score.totalScore}`);
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
