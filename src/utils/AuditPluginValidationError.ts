export class AuditPluginValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditPluginValidationError'
  }
}
