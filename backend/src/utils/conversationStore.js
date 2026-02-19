import crypto from 'crypto';

const conversations = new Map();

export function createConversation({ username, systemPrompt }) {
	const id = crypto.randomUUID();
	const conversation = {
		id,
		username,
		systemPrompt,
		messages: [{ role: 'system', content: systemPrompt }],
		exchangeCount: 0,
		createdAt: Date.now(),
	};

	conversations.set(id, conversation);
	return conversation;
}

export function getConversation(id) {
	return conversations.get(id);
}

export function addMessage(id, message) {
	const convo = conversations.get(id);
	if (!convo) return null;
	convo.messages.push(message);
	return convo;
}

export function incrementExchange(id) {
	const convo = conversations.get(id);
	if (!convo) return null;
	convo.exchangeCount += 1;
	return convo.exchangeCount;
}
