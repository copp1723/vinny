"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class Logger {
    logger; // Use definite assignment assertion
    context;
    constructor(context) {
        this.context = context;
        this.setupLogger();
    }
    setupLogger() {
        const logDir = process.env.LOG_FILE_PATH ? path_1.default.dirname(process.env.LOG_FILE_PATH) : './logs';
        fs_extra_1.default.ensureDirSync(logDir);
        const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return JSON.stringify({
                timestamp,
                level,
                context: context || this.context,
                message,
                ...meta
            });
        }));
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: logFormat,
            transports: [
                new winston_1.default.transports.File({
                    filename: process.env.LOG_FILE_PATH || path_1.default.join(logDir, 'vinny-agent.log'),
                    maxsize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 5,
                }),
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                })
            ]
        });
        // Add console transport in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ timestamp, level, message, context }) => {
                    return `${timestamp} [${context || this.context}] ${level}: ${message}`;
                }))
            }));
        }
    }
    info(message, meta) {
        this.logger.info(message, { context: this.context, ...meta });
    }
    error(message, meta) {
        this.logger.error(message, { context: this.context, ...meta });
    }
    warn(message, meta) {
        this.logger.warn(message, { context: this.context, ...meta });
    }
    debug(message, meta) {
        this.logger.debug(message, { context: this.context, ...meta });
    }
    verbose(message, meta) {
        this.logger.verbose(message, { context: this.context, ...meta });
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map