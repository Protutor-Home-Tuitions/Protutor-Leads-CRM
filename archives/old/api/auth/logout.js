export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  // JWT is stateless — logout is handled client-side by deleting the token
  // If you want server-side token revocation, add a blocklist table here
  return res.status(200).json({ message: 'Logged out' })
}
