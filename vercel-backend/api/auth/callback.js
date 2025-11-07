/**
 * GitHub OAuth callback handler
 * Exchanges authorization code for access token
 *
 * This serverless function handles the OAuth callback from GitHub
 */

// Rate limiting state (in-memory, resets on cold start)
const rateLimitStore = new Map();

/**
 * Check rate limit for an IP address
 * Limit: 10 requests per minute per IP
 *
 * @param {string} ip - Client IP address
 * @returns {boolean} true if request is allowed, false if rate limited
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const limit = 10;
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const data = rateLimitStore.get(ip);

  // Reset if window expired
  if (now > data.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Check if limit exceeded
  if (data.count >= limit) {
    return false;
  }

  // Increment counter
  data.count++;
  return true;
}

/**
 * Get client IP address from request
 * @param {Object} req - Request object
 * @returns {string} IP address
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export default async function handler(req, res) {
  // Get client IP for rate limiting
  const clientIP = getClientIP(req);

  // Check rate limit
  if (!checkRateLimit(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again in 1 minute',
      retryAfter: 60
    });
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code } = req.body;

  // Validate input
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  // Validate environment variables
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error('Missing required environment variables');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Trim environment variables to remove any accidental whitespace/newlines
    const clientId = process.env.GITHUB_CLIENT_ID.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET.trim();

    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    };

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await tokenResponse.json();

    // Check for errors from GitHub
    if (data.error) {
      console.error('GitHub OAuth error:', data.error, data.error_description);
      res.status(400).json({
        error: data.error_description || data.error || 'OAuth authentication failed'
      });
      return;
    }

    // Validate token was received
    if (!data.access_token) {
      console.error('No access token in response:', data);
      res.status(500).json({ error: 'Failed to obtain access token' });
      return;
    }

    // Return access token to client
    res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      scope: data.scope || '',
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
