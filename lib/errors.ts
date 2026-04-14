export class ConflictError extends Error {
  readonly currentVersion: number;

  constructor(message: string, currentVersion: number) {
    super(message);
    this.name = "ConflictError";
    this.currentVersion = currentVersion;
  }
}
