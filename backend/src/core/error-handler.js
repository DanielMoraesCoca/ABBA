// backend/src/core/error-handler.js
const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }

  handle(error, context = {}) {
    // Log error
    logger.error(error.message || error, {
      ...context,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Store error
    this.errors.push({
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date()
    });

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Return formatted error
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  async handleAsync(promise, context = {}) {
    try {
      return await promise;
    } catch (error) {
      return this.handle(error, context);
    }
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit).reverse();
  }

  clearErrors() {
    this.errors = [];
  }

  // Express middleware
  middleware() {
    return (err, req, res, next) => {
      const errorResponse = this.handle(err, {
        method: req.method,
        url: req.url,
        body: req.body,
        headers: req.headers
      });

      res.status(err.status || 500).json(errorResponse);
    };
  }
}

module.exports = new ErrorHandler();