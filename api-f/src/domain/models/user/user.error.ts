// domain/user/user.errors.ts
export class UserNotFoundError extends Error {}
export class EmailAlreadyExistsError extends Error {}
export class EmailAlreadyVerifiedError extends Error {}
export class InvalidVerificationTokenError extends Error {} 