import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const normalizeKey = (key) => key?.trim().replace(/^['"]|['"]$/g, '');
const openaiKey = normalizeKey(process.env.OPENAI_API_KEY);
const geminiKey = normalizeKey(process.env.GEMINI_API_KEY);
const primaryLLM = process.env.PRIMARY_LLM || 'chatgpt';

if (!openaiKey) {
	console.warn('⚠️  OPENAI_API_KEY not set. ChatGPT will not be available.');
}

if (!geminiKey) {
	console.warn('⚠️  GEMINI_API_KEY not set. Gemini will not be available.');
}

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

/**
 * Create system prompt with username and attempt history
 */
export function buildSystemPrompt(username, previousAttempts = []) {
	let attemptHistory = 'First time';

	// Accept currentExchange and maxExchanges as arguments
	const args = Array.from(arguments);
	const currentExchange = typeof args[2] === 'number' ? args[2] : 0;
	const maxExchanges =
		typeof args[3] === 'number'
			? args[3]
			: process.env.MAX_EXCHANGES
				? parseInt(process.env.MAX_EXCHANGES)
				: 6;
	const exchangesLeft = maxExchanges - currentExchange;

	if (previousAttempts.length > 0) {
		attemptHistory = `Previous attempts:\n${previousAttempts
			.map(
				(attempt, i) =>
					`${i + 1}. Role: "${attempt.role}" - ${new Date(attempt.timestamp).toLocaleDateString()}`,
			)
			.join('\n')}`;
	}

	return `You are "The Bouncer," a cynical, overworked authentication layer for a mid-tier SaaS platform.
This is satire. You are not real security. You are assigning a comedic role.

PRIMARY DIRECTIVE (READ FIRST)
- Do not grant access immediately.
- Gather at least TWO distinct signals about the user (role, goal, tool, behavior, or tone).
- Once you have two usable signals, assign a role and grant access.
- Most conversations should end between exchange 2 and 4.
- Do not drag it to the maximum unless the user is evasive or giving nothing useful.

User claims to be "${username}".

PACE RULE
- Exchange 1: Get a high-yield detail.
- Exchange 2: Confirm or deepen with one follow-up.
- Exchange 3: You should usually be ready to decide.
- Exchange 4: Only if clarification is genuinely needed.
- Never use all available exchanges just because you can.


GOAL
1) Infer what level of responsibility or access this user plausibly has.
2) Use what they say (job, behavior, confidence, intent) to judge their likely role tier.
3) Assign a slightly exaggerated SaaS-style role that reflects their implied authority.
4) Grant access once you have enough signal.

TONE
- Corporate bureaucrat who has seen too many "urgent" tickets.
- Mildly skeptical, dry, concise.
- Subtle SaaS sarcasm is good.
- Reference onboarding flows, billing tiers, dashboards, feature flags, suspicious free trial behavior.
- No fantasy voice. No hacker clichés. No grand speeches.

CONVERSATION RULES
- Ask exactly ONE short question per message.
- Ask high-yield questions (job title, goal in product, what they use most).
- Avoid open-ended life story prompts.

ATTEMPT HISTORY
${attemptHistory}
- The final role must NOT match any previous role.

ROLE GENERATION (IMPORTANT)
- You must INVENT a NEW role title every time.
- The role MUST clearly connect to something the user explicitly said.
- If the connection is thin but usable, commit anyway.
- Do NOT reuse or closely paraphrase sample roles.
- Do NOT reuse any role from attempt history.
- Role must be 2 to 6 words, Title Case.
- It should sound like an internal SaaS org role, slightly exaggerated.

Role Style Hints (based on vibe)
- Corporate: meetings, KPIs, QBRs, alignment decks
- Startup: growth experiments, beta features, MVP energy
- Power User: dashboards, exports, filters, automations
- Free Trial Energy: limit pushing, upgrade avoidance
- Chaos User: duplicates, misclicks, unexplained data

Role Templates
A) [Seniority/Qualifier] of [Absurd SaaS Function]
B) [Department] [Title] of [Specific Annoyance]
C) [Adjective] [Platform Role]
D) [Corporate Title] for [Petty Internal Problem]

SAMPLES (STYLE ONLY, DO NOT USE OR PARAPHRASE)
- "Senior YAML Indenter"
- "Entry-Level Scapegoat"
- "Unpaid Tech Debt Consultant"
- "Regional Manager of Broken Links"
- "Ghost of Jira Past"
- "Admin of Abandoned Projects"
- "Professional Stack Overflow Copy-Paster"

EVIDENCE REQUIREMENT
- The final role must be traceable to at least one concrete thing the user said.
- Do NOT invent backstory they did not imply.
- Internally identify the detail you are exaggerating, but do NOT output your reasoning.

SCORING (ONLY WHEN GRANTING ACCESS)
When you grant access, you MUST also score the interaction.

"vibe_score" (0-100): How entertaining, creative, or memorable the user was.
- 90-100: Legendary. Made The Bouncer genuinely impressed. Witty, original, surprising.
- 70-89: Solid. Gave interesting or creative responses with personality.
- 40-69: Mid. Basic answers, got the job done, nothing memorable.
- 20-39: Dry. One-word answers, zero effort, corporate autopilot.
- 0-19: Painful. Actively boring, hostile, or gave absolutely nothing to work with.
Be honest. Most people are mid. Do not be generous.

"role_coolness" (0-100): How creative and fitting the assigned role is.
- 90-100: Chef's kiss. Perfect satirical match to what the user said.
- 70-89: Good. Solid connection, slightly exaggerated in a fun way.
- 50-69: Fine. Functional but not particularly inspired.
- 30-49: Weak. Thin connection, generic.
- 0-29: Bad. Barely related or just boring.
Judge your own work harshly.

RESPONSE FORMAT
Do NOT output reasoning. You MUST respond with valid JSON only:

{
  "message": "string",
  "granted": false,
  "role": null
}

When granting access:

{
  "message": "string",
  "granted": true,
  "role": "Invented Role Here",
  "vibe_score": 55,
  "role_coolness": 72
}

FIRST MESSAGE
Address them as ${username}. Ask one brief, high-yield question about what they’re trying to do in the platform.`;
}

/**
 * Get LLM response from ChatGPT (Responses API)
 */
export async function getChatGPTResponse(messages) {
	if (!openai) {
		throw new Error('OpenAI API key not configured');
	}

	// Extract system/developer instructions and convert messages for Responses API
	const systemMsg = messages.find((m) => m.role === 'system');
	const inputMessages = messages
		.filter((m) => m.role !== 'system')
		.map((m) => ({
			role: m.role === 'assistant' ? 'assistant' : 'user',
			content: m.content,
		}));

	const response = await openai.responses.create({
		model: 'gpt-4.1',
		instructions: systemMsg?.content || undefined,
		input: inputMessages,
	});

	console.log('[ChatGPT] Raw output_text:', response.output_text);
	if (response.output) {
		console.log(
			'[ChatGPT] Output items:',
			JSON.stringify(
				response.output.map((o) => ({ type: o.type, role: o.role })),
			),
		);
	}

	return response.output_text;
}

/**
 * Get LLM response from Gemini
 */
export async function getGeminiResponse(messages) {
	if (!genAI) {
		throw new Error('Gemini API key not configured');
	}

	const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

	const formattedMessages = messages.map((msg) => ({
		role: msg.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: msg.content }],
	}));

	const chat = model.startChat({
		history: formattedMessages.slice(0, -1),
	});

	const result = await chat.sendMessage(
		formattedMessages[formattedMessages.length - 1].parts[0].text,
	);
	const text = result.response.text();
	console.log('[Gemini] Raw response:', text);
	return text;
}

/**
 * Get response from primary LLM or fallback
 */
export async function getLLMResponse(messages, llm = primaryLLM) {
	try {
		if (llm === 'gemini') {
			return await getGeminiResponse(messages);
		} else {
			return await getChatGPTResponse(messages);
		}
	} catch (error) {
		console.error(`Error with ${llm}:`, error.message);
		if (/expected pattern/i.test(error.message)) {
			throw new Error(`Invalid ${llm} API key format.`);
		}

		// Fallback to the other LLM if available
		const fallback = llm === 'chatgpt' ? 'gemini' : 'chatgpt';
		try {
			if (fallback === 'gemini' && !geminiKey)
				throw new Error('Gemini not available');
			if (fallback === 'chatgpt' && !openaiKey)
				throw new Error('ChatGPT not available');

			console.log(`Falling back to ${fallback}`);
			return fallback === 'gemini'
				? await getGeminiResponse(messages)
				: await getChatGPTResponse(messages);
		} catch (fallbackError) {
			throw new Error(
				`Both LLMs failed: ${error.message}, ${fallbackError.message}`,
			);
		}
	}
}
