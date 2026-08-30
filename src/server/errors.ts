export class AuthorizationError extends Error {
  constructor(message = "Forbidden.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InvalidTokenError extends Error {
  constructor(message = "This link is invalid or has expired.") {
    super(message);
    this.name = "InvalidTokenError";
  }
}
