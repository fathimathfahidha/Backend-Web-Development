
require('dotenv').config();

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const { AuthError } = require('./services/authService');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // Invalid JSON or an oversized request body.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON',
      },
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    });
  }

  if (error instanceof AuthError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Never log request bodies, passwords, hashes, or raw error details.
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

const port = Number(process.env.PORT || 3000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

module.exports = app;
