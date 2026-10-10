// An error that carries an HTTP status code. Controllers throw this for expected problems.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Handles requests that did not match any route.
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// Single place where every error is turned into a JSON response.
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;
  let errors;

  if (err.name === 'ValidationError') {
    // Mongoose schema validation failed (missing field, price <= 0, ...).
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.name === 'CastError' ? `${e.path} must be a valid ${e.kind.toLowerCase()}` : e.message
    }));
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    // A value could not be converted to the schema type (e.g. price: "abc").
    statusCode = 400;
    message = `Invalid value for '${err.path}'`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key error (unique index on sku).
    statusCode = 409;
    const field = Object.keys(err.keyValue || { sku: 1 })[0];
    message = `A product with this ${field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    // express.json() could not parse the body.
    statusCode = 400;
    message = 'Request body contains invalid JSON';
  } else if (
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError'
  ) {
    statusCode = 503;
    message = 'Database is unavailable. Please try again later';
  }

  if (statusCode >= 500) {
    console.error(err);
    // Never leak internal details to clients in production.
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      message = 'Internal server error';
    }
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (statusCode === 500 && process.env.NODE_ENV !== 'production') body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { AppError, notFound, errorHandler };
