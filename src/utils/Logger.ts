import winston, { format } from 'winston';
import path from 'path';
import fs from 'fs-extra';

export class Logger {
  private logger!: winston.Logger; // Use definite assignment assertion
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.setupLogger();
  }

  private setupLogger(): void {
    const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';
    fs.ensureDirSync(logDir);

    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context: context || this.context,
          message,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { context: this.context },
      transports: [
        new winston.transports.File({
          filename: process.env.LOG_FILE_PATH || path.join(logDir, 'vinny-agent.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        })
      ]
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.label({ label: this.context }),
          format.timestamp(),
          format.printf(({ timestamp, level, message, label }) => {
            return `${timestamp} [${label}] ${level}: ${message}`;
          })
        )
      }));
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  // Step-based logging methods for agent workflows
  stepStart(message: string, meta?: any): void {
    this.logger.info(`🟡 STEP START: ${message}`, { context: this.context, step: 'start', ...meta });
  }

  stepSuccess(message: string, meta?: any): void {
    this.logger.info(`✅ STEP SUCCESS: ${message}`, { context: this.context, step: 'success', ...meta });
  }

  stepFailed(message: string, error?: Error, meta?: any): void {
    const errorInfo = error ? { 
      message: error.message, 
      stack: error.stack,
      name: error.name 
    } : {};
    
    this.logger.error(`❌ STEP FAILED: ${message}`, { 
      context: this.context, 
      step: 'failed', 
      error: errorInfo,
      ...meta 
    });
  }
}
