function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {}).join(', ');
    return res.status(409).json({ message: `Duplicate value for: ${field}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ID: ${err.value}` });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };
