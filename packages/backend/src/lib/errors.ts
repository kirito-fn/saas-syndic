export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Non authentifié") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflit") {
    super(409, message);
  }
}
