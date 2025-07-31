"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importStar(require("winston"));
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
            defaultMeta: { context: this.context },
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
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.label({ label: this.context }), winston_1.format.timestamp(), winston_1.format.printf(({ timestamp, level, message, label }) => {
                    return `${timestamp} [${label}] ${level}: ${message}`;
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
    // Step-based logging methods for agent workflows
    stepStart(message, meta) {
        this.logger.info(`🟡 STEP START: ${message}`, { context: this.context, step: 'start', ...meta });
    }
    stepSuccess(message, meta) {
        this.logger.info(`✅ STEP SUCCESS: ${message}`, { context: this.context, step: 'success', ...meta });
    }
    stepFailed(message, error, meta) {
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
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map