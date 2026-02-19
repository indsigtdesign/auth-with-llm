import app from '../backend/src/index.js';

// Vercel serverless function handler
export default (req, res) => {
	// Prepend /api to the path since Express routes expect it
	req.url = '/api' + req.url;
	return app(req, res);
};
