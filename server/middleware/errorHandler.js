export function notFoundHandler(req, res) {
  if (req.accepts('html')) {
    return res.status(404).sendFile('404.html', { root: './public' });
  }
  return res.status(404).json({ error: 'Endpoint not found' });
}

export function globalErrorHandler(err, req, res, next) {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'An unexpected server error occurred'
  });
}
