import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

// Settings endpoint
app.get('/api/settings', (req, res) => {
	res.json({
		maxExchanges: parseInt(process.env.MAX_EXCHANGES) || 6,
		availableLLMs: ['chatgpt', 'gemini'],
		primaryLLM: process.env.PRIMARY_LLM || 'chatgpt',
	});
});

// Only listen in local development
if (process.env.NODE_ENV !== 'production') {
	app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
}

// Export for Vercel serverless
export default app;
