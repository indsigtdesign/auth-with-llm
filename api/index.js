import app from '../backend/src/index.js';

// Vercel serverless function handler
export default (req, res) => {
	// Ensure URL has /api prefix for Express route matching
	if (!req.url.startsWith('/api')) {
		req.url = '/api' + req.url;
	}
	return app(req, res);
};
