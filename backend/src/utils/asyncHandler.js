// Express 4 does not catch rejected promises from async route handlers —
// an unhandled rejection just leaves the request hanging with no response
// until the client times out (this is what was causing silent
// "registration failed" / "login failed" style errors with no real cause
// shown). Wrap every async controller with this so errors reach the
// central error handler in server.js instead of hanging the request.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
