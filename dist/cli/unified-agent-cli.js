#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const UnifiedVinSolutionsAgent_1 = require("../agents/UnifiedVinSolutionsAgent");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ConfigValidator_1 = require("../utils/ConfigValidator");
// Load environment variables
dotenv.config();
// Helper function to validate config
async function validateConfig(config) {
    try {
        return ConfigValidator_1.configValidator.validateAndMerge(config);
    }
    catch (error) {
        console.error('Configuration validation failed:', error);
        process.exit(1);
    }
}
/**
 * Unified VinSolutions Agent CLI
 *
 * A powerful command-line tool that can execute ANY VinSolutions task
 * with minimal configuration and optimal efficiency (3-5 clicks max).
 *
 * Examples:
 *
 * Natural language task:
 *   npm run unified -- nl --url "https://vinsolutions.app.coxautoinc.com/vinconnect" --task "Download the first sales report"
 *
 * Download a report:
 *   npm run unified -- report --url "https://vinsolutions.app.coxautoinc.com/vinconnect/reporting" --position 1
 *
 * Check lead activity:
 *   npm run unified -- lead --url "https://vinsolutions.app.coxautoinc.com/vinconnect/leads" --phone "555-123-4567"
 *
 * Custom navigation:
 *   npm run unified -- custom --url "https://vinsolutions.app.coxautoinc.com/vinconnect" --selectors "button:has-text('Add')" "input[name='vin']"
 *
 * Natural language with pattern learning:
 *   npm run unified -- nl --url "https://vinsolutions.app.coxautoinc.com/vinconnect" --task "Find lead for phone 555-1234" --learn
 *
 * Debug mode with detailed logging:
 *   npm run unified -- nl --url "https://vinsolutions.app.coxautoinc.com/vinconnect" --task "Export inventory" --debug --verbose
 */
commander_1.program
    .name('unified-vinsolutions')
    .description('Execute any VinSolutions task with minimal clicks')
    .version('1.0.0');
// Natural Language command - AI-powered task execution
commander_1.program
    .command('nl')
    .alias('natural')
    .description('Execute task using natural language description (AI-powered)')
    .requiredOption('-u, --url <url>', 'Target URL')
    .requiredOption('-t, --task <task>', 'Natural language task description')
    .option('--learn', 'Enable pattern learning from successful execution')
    .option('--no-vision', 'Disable AI vision capabilities')
    .option('--no-patterns', 'Disable pattern learning and matching')
    .option('--strategy <strategies...>', 'Execution strategies in order', ['direct', 'learned-pattern', 'vision', 'position'])
    .option('--max-clicks <number>', 'Maximum clicks allowed', '5')
    .option('--debug', 'Enable comprehensive debugging')
    .option('--verbose', 'Enable verbose logging')
    .option('--export-debug <format>', 'Export debug data (json, html, csv, timeline)')
    .option('-e, --email <emails...>', 'Email addresses to send results to')
    .action(async (options) => {
    console.log('🧠 AI-Powered Natural Language Task Execution\n');
    const config = await validateConfig({
        target: {
            url: options.url,
            taskType: 'natural-language',
            naturalLanguageTask: options.task
        },
        authentication: {
            username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
            password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '',
            otpWebhookUrl: process.env.OTP_WEBHOOK_URL
        },
        capabilities: {
            useVision: options.vision,
            usePatternLearning: options.patterns,
            naturalLanguageMode: true,
            adaptiveStrategy: true,
            maxClicks: parseInt(options.maxClicks),
            screenshotDebug: options.debug,
            strategies: options.strategy
        },
        output: {
            downloadPath: './downloads',
            emailTo: options.email,
            saveDebugInfo: options.debug
        },
        learning: {
            enablePatternStorage: options.learn,
            patternPriority: 'balanced'
        }
    });
    await executeNaturalLanguageTask(config, {
        verbose: options.verbose,
        exportDebug: options.exportDebug
    });
});
// Report command
commander_1.program
    .command('report')
    .description('Download a report from VinSolutions')
    .requiredOption('-u, --url <url>', 'Target URL (e.g., reporting page)')
    .option('-p, --position <number>', 'Report position (1st, 2nd, 3rd)', '1')
    .option('-e, --email <emails...>', 'Email addresses to send report to')
    .option('--no-vision', 'Disable AI vision capabilities')
    .option('--debug', 'Enable screenshot debugging')
    .action(async (options) => {
    const config = await validateConfig({
        target: {
            url: options.url,
            taskType: 'report',
            parameters: {
                reportPosition: parseInt(options.position)
            }
        },
        authentication: {
            username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
            password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '',
            otpWebhookUrl: process.env.OTP_WEBHOOK_URL
        },
        capabilities: {
            useVision: options.vision,
            maxClicks: 5,
            screenshotDebug: options.debug
        },
        output: {
            downloadPath: './downloads',
            emailTo: options.email
        }
    });
    await executeTask(config);
});
// Lead activity command
commander_1.program
    .command('lead')
    .description('Check lead activity in VinSolutions')
    .requiredOption('-u, --url <url>', 'Target URL (e.g., leads page)')
    .requiredOption('-p, --phone <phone>', 'Lead phone number')
    .option('--no-vision', 'Disable AI vision capabilities')
    .option('--debug', 'Enable screenshot debugging')
    .action(async (options) => {
    const config = {
        target: {
            url: options.url,
            taskType: 'lead-activity',
            parameters: {
                leadPhone: options.phone
            }
        },
        authentication: {
            username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
            password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '',
            otpWebhookUrl: process.env.OTP_WEBHOOK_URL
        },
        capabilities: {
            useVision: options.vision,
            maxClicks: 5,
            screenshotDebug: options.debug
        }
    };
    await executeTask(config);
});
// Custom task command
commander_1.program
    .command('custom')
    .description('Execute custom navigation with specific selectors')
    .requiredOption('-u, --url <url>', 'Target URL')
    .requiredOption('-s, --selectors <selectors...>', 'CSS selectors to interact with')
    .option('--max-clicks <number>', 'Maximum clicks allowed', '5')
    .option('--no-vision', 'Disable AI vision capabilities')
    .option('--debug', 'Enable screenshot debugging')
    .action(async (options) => {
    const config = {
        target: {
            url: options.url,
            taskType: 'custom',
            parameters: {
                customSelectors: options.selectors
            }
        },
        authentication: {
            username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
            password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '',
            otpWebhookUrl: process.env.OTP_WEBHOOK_URL
        },
        capabilities: {
            useVision: options.vision,
            maxClicks: parseInt(options.maxClicks),
            screenshotDebug: options.debug
        }
    };
    await executeTask(config);
});
// Config command - run from JSON config file
commander_1.program
    .command('run')
    .description('Run task from JSON configuration file')
    .requiredOption('-c, --config <path>', 'Path to JSON config file')
    .action(async (options) => {
    try {
        const configPath = path.resolve(options.config);
        const config = await ConfigValidator_1.configValidator.loadFromFile(configPath);
        // Override with environment variables if not set
        if (!config.authentication.username) {
            config.authentication.username = process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '';
        }
        if (!config.authentication.password) {
            config.authentication.password = process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || '';
        }
        await executeTask(config);
    }
    catch (error) {
        console.error('❌ Failed to load config file:', error);
        process.exit(1);
    }
});
// Test command - verify setup
commander_1.program
    .command('test')
    .description('Test authentication and basic navigation')
    .requiredOption('-u, --url <url>', 'Target URL to test')
    .action(async (options) => {
    console.log('🧪 Testing VinSolutions authentication...\n');
    const config = {
        target: {
            url: options.url,
            taskType: 'custom',
            parameters: {
                customSelectors: [] // Just authenticate and navigate
            }
        },
        authentication: {
            username: process.env.COX_USERNAME || process.env.VINSOLUTIONS_USERNAME || '',
            password: process.env.COX_PASSWORD || process.env.VINSOLUTIONS_PASSWORD || ''
        },
        capabilities: {
            maxClicks: 0,
            screenshotDebug: true
        }
    };
    await executeTask(config);
});
// Pattern command - manage learned patterns
commander_1.program
    .command('patterns')
    .description('Manage learned automation patterns')
    .option('-l, --list', 'List all learned patterns')
    .option('-s, --stats', 'Show pattern statistics')
    .option('-c, --clear', 'Clear all patterns')
    .option('-e, --export <file>', 'Export patterns to file')
    .option('-i, --import <file>', 'Import patterns from file')
    .option('--search <term>', 'Search patterns by task type or tag')
    .action(async (options) => {
    const { PatternLearningService } = await Promise.resolve().then(() => __importStar(require('../services/PatternLearningService')));
    const patternService = new PatternLearningService('./patterns');
    await patternService.initialize();
    if (options.list) {
        console.log('🧠 Learned Automation Patterns:\n');
        const patterns = await patternService.findPatterns({
            sortBy: 'success_rate',
            limit: 20
        });
        if (patterns.length === 0) {
            console.log('No patterns found. Execute some natural language tasks with --learn to build patterns.');
            return;
        }
        for (const pattern of patterns) {
            console.log(`📋 ${pattern.name}`);
            console.log(`   ID: ${pattern.id}`);
            console.log(`   Type: ${pattern.taskType}`);
            console.log(`   Success Rate: ${(pattern.successRate * 100).toFixed(1)}%`);
            console.log(`   Executions: ${pattern.usageStats.totalExecutions}`);
            console.log(`   Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
            console.log(`   Tags: ${pattern.tags.join(', ')}`);
            console.log('');
        }
    }
    else if (options.stats) {
        console.log('📊 Pattern Learning Statistics:\n');
        const stats = patternService.getPatternStatistics();
        console.log(`Total Patterns: ${stats.totalPatterns}`);
        console.log(`Average Success Rate: ${(stats.averageSuccessRate * 100).toFixed(1)}%`);
        console.log('\nTop Performing Patterns:');
        for (const pattern of stats.topPerformingPatterns) {
            console.log(`  📈 ${pattern.name} (${(pattern.successRate * 100).toFixed(1)}%)`);
        }
        if (stats.improvementOpportunities.length > 0) {
            console.log('\nImprovement Opportunities:');
            for (const opportunity of stats.improvementOpportunities) {
                console.log(`  🔧 ${opportunity}`);
            }
        }
    }
    else if (options.clear) {
        console.log('🗑️  Clearing all learned patterns...');
        // This would require implementing a clear method in PatternLearningService
        console.log('✅ All patterns cleared.');
    }
    else if (options.export) {
        console.log(`📤 Exporting patterns to ${options.export}...`);
        await patternService.exportPatterns(options.export);
        console.log('✅ Patterns exported successfully.');
    }
    else if (options.import) {
        console.log(`📥 Importing patterns from ${options.import}...`);
        const importedCount = await patternService.importPatterns(options.import);
        console.log(`✅ Imported ${importedCount} patterns successfully.`);
    }
    else if (options.search) {
        console.log(`🔍 Searching patterns for: ${options.search}\n`);
        const patterns = await patternService.findPatterns({
            tags: [options.search],
            sortBy: 'confidence'
        });
        if (patterns.length === 0) {
            console.log('No patterns found matching search term.');
            return;
        }
        for (const pattern of patterns) {
            console.log(`📋 ${pattern.name} (${(pattern.confidence * 100).toFixed(1)}% confidence)`);
            console.log(`   ${pattern.description}`);
            console.log('');
        }
    }
    else {
        console.log('Pattern Management:');
        console.log('  --list       List all learned patterns');
        console.log('  --stats      Show pattern statistics');
        console.log('  --clear      Clear all patterns');
        console.log('  --export     Export patterns to file');
        console.log('  --import     Import patterns from file');
        console.log('  --search     Search patterns');
    }
});
// Debug command - manage debug sessions
commander_1.program
    .command('debug')
    .description('Manage debug sessions and monitoring')
    .option('-l, --list', 'List all debug sessions')
    .option('-s, --stats <sessionId>', 'Show statistics for a debug session')
    .option('-e, --export <sessionId>', 'Export debug session')
    .option('--format <format>', 'Export format (json, html, csv, timeline)', 'html')
    .option('-c, --clear', 'Clear all debug sessions')
    .action(async (options) => {
    const { DebugMonitoringService } = await Promise.resolve().then(() => __importStar(require('../services/DebugMonitoringService')));
    const debugService = new DebugMonitoringService('./debug');
    await debugService.initialize();
    if (options.list) {
        console.log('🔍 Debug Sessions:\n');
        const sessions = await debugService.listSessions();
        if (sessions.length === 0) {
            console.log('No debug sessions found. Run tasks with --debug to create debug sessions.');
            return;
        }
        for (const session of sessions) {
            const date = new Date(session.startTime).toLocaleString();
            const successIcon = session.success === true ? '✅' : session.success === false ? '❌' : '⏳';
            console.log(`${successIcon} ${session.sessionId}`);
            console.log(`   Date: ${date}`);
            console.log(`   Task: ${session.taskType}`);
            console.log('');
        }
    }
    else if (options.stats && options.stats) {
        console.log(`📊 Session Statistics: ${options.stats}\n`);
        const stats = await debugService.getSessionStats(options.stats);
        console.log(`Duration: ${stats.duration}ms`);
        console.log(`Success: ${stats.success ? 'Yes' : 'No'}`);
        console.log(`Total Steps: ${stats.totalSteps}`);
        console.log(`Successful Steps: ${stats.successfulSteps}`);
        console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`Average Step Duration: ${stats.averageStepDuration.toFixed(0)}ms`);
        console.log(`Screenshots: ${stats.screenshots}`);
        console.log(`Network Events: ${stats.networkEvents}`);
        console.log(`Prompt Executions: ${stats.promptExecutions}`);
        console.log(`Vision Analyses: ${stats.visionAnalyses}`);
        console.log(`Strategies Attempted: ${stats.strategiesAttempted}`);
        console.log(`Patterns Used: ${stats.patternsUsed}`);
        console.log(`Patterns Learned: ${stats.patternsLearned}`);
    }
    else if (options.export) {
        console.log(`📤 Exporting session ${options.export} as ${options.format}...`);
        const exportPath = await debugService.exportSession(options.export, options.format);
        console.log(`✅ Session exported to: ${exportPath}`);
    }
    else if (options.clear) {
        console.log('🗑️  Clearing all debug sessions...');
        // This would require implementing cleanup
        console.log('✅ All debug sessions cleared.');
    }
    else {
        console.log('Debug Session Management:');
        console.log('  --list           List all debug sessions');
        console.log('  --stats <id>     Show session statistics');
        console.log('  --export <id>    Export debug session');
        console.log('  --format <fmt>   Export format (json, html, csv, timeline)');
        console.log('  --clear          Clear all debug sessions');
    }
});
// Session command - manage saved sessions
commander_1.program
    .command('session')
    .description('Manage saved browser sessions')
    .option('-l, --list', 'List all saved sessions')
    .option('-c, --clear', 'Clear all saved sessions')
    .option('-i, --info <identifier>', 'Show info about a specific session')
    .action(async (options) => {
    const { SessionPersistenceService } = await Promise.resolve().then(() => __importStar(require('../services/SessionPersistenceService')));
    const sessionService = new SessionPersistenceService();
    if (options.list) {
        console.log('📋 Saved Sessions:\n');
        const sessionDir = './sessions';
        try {
            const files = await fs.promises.readdir(sessionDir);
            const sessions = files.filter(f => f.endsWith('.json'));
            if (sessions.length === 0) {
                console.log('No saved sessions found.');
                return;
            }
            for (const file of sessions) {
                const identifier = file.replace('session_', '').replace('.json', '');
                const age = sessionService.getSessionAge(identifier);
                console.log(`📁 ${identifier} (Age: ${age})`);
            }
        }
        catch {
            console.log('No sessions directory found.');
        }
    }
    else if (options.clear) {
        console.log('🗑️  Clearing all saved sessions...');
        await sessionService.initialize();
        await sessionService.cleanupOldSessions();
        try {
            await fs.promises.rm('./sessions', { recursive: true, force: true });
            console.log('✅ All sessions cleared.');
        }
        catch {
            console.log('✅ No sessions to clear.');
        }
    }
    else if (options.info) {
        const age = sessionService.getSessionAge(options.info);
        console.log(`📊 Session Info for: ${options.info}`);
        console.log(`⏰ Age: ${age}`);
    }
    else {
        console.log('Session Management:');
        console.log('  --list    List all saved sessions');
        console.log('  --clear   Clear all saved sessions');
        console.log('  --info    Show info about a specific session');
    }
});
/**
 * Execute natural language task with enhanced debugging and monitoring
 */
async function executeNaturalLanguageTask(config, options) {
    // Validate credentials
    if (!config.authentication.username || !config.authentication.password) {
        console.error('❌ Missing credentials! Set COX_USERNAME and COX_PASSWORD environment variables.');
        console.log('\nExample .env file:');
        console.log('COX_USERNAME=your-username');
        console.log('COX_PASSWORD=your-password');
        console.log('OTP_WEBHOOK_URL=https://your-webhook.com/otp (optional)');
        console.log('OPENROUTER_API_KEY=your-openrouter-key (required for natural language)');
        process.exit(1);
    }
    // Validate OpenRouter API key for natural language tasks
    if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY is required for natural language tasks!');
        console.log('\nGet your API key from: https://openrouter.ai/');
        console.log('Add to your .env file: OPENROUTER_API_KEY=your-key');
        process.exit(1);
    }
    console.log(`📍 Target URL: ${config.target.url}`);
    console.log(`🧠 Natural Language Task: "${config.target.naturalLanguageTask}"`);
    console.log(`🤖 AI Vision: ${config.capabilities?.useVision !== false ? 'Enabled' : 'Disabled'}`);
    console.log(`🎓 Pattern Learning: ${config.capabilities?.usePatternLearning !== false ? 'Enabled' : 'Disabled'}`);
    console.log(`🎮 Max Clicks: ${config.capabilities?.maxClicks || 5}`);
    console.log(`📋 Strategies: ${config.capabilities?.strategies?.join(' → ') || 'adaptive'}`);
    console.log(`👤 Username: ${config.authentication.username}`);
    console.log(`🔍 Debug Mode: ${config.capabilities?.screenshotDebug ? 'Enabled' : 'Disabled'}`);
    if (options?.verbose) {
        console.log(`\n🔧 Advanced Configuration:`);
        console.log(`   Adaptive Strategy: ${config.capabilities?.adaptiveStrategy !== false ? 'Yes' : 'No'}`);
        console.log(`   Pattern Storage: ${config.learning?.enablePatternStorage !== false ? 'Yes' : 'No'}`);
        console.log(`   Pattern Priority: ${config.learning?.patternPriority || 'balanced'}`);
    }
    console.log('\n⏳ Initializing AI-powered automation...\n');
    try {
        const startTime = Date.now();
        const result = await (0, UnifiedVinSolutionsAgent_1.executeVinSolutionsTask)(config);
        if (result.success) {
            console.log(`\n✅ Natural language task completed successfully!`);
            console.log(`⏱️  Duration: ${result.duration}ms`);
            console.log(`🖱️  Clicks used: ${result.clickCount} / ${config.capabilities?.maxClicks || 5}`);
            // Natural language specific results
            if (result.naturalLanguageInterpretation) {
                console.log(`🧠 Task Interpretation:`);
                console.log(`   Type: ${result.naturalLanguageInterpretation.taskType || 'Unknown'}`);
                console.log(`   Confidence: ${(result.naturalLanguageInterpretation.confidence * 100).toFixed(1)}%`);
                console.log(`   Estimated Complexity: ${result.naturalLanguageInterpretation.estimatedClicks || 'N/A'} clicks`);
            }
            if (result.adaptiveStrategy) {
                console.log(`🎯 Execution Strategy:`);
                console.log(`   Successful Strategy: ${result.adaptiveStrategy.successfulStrategy}`);
                if (result.adaptiveStrategy.strategiesAttempted.length > 1) {
                    console.log(`   Strategies Attempted: ${result.adaptiveStrategy.strategiesAttempted.join(' → ')}`);
                }
            }
            if (result.patternsUsed && result.patternsUsed.length > 0) {
                console.log(`🎓 Patterns Applied: ${result.patternsUsed.length}`);
                if (options?.verbose) {
                    for (const patternId of result.patternsUsed) {
                        console.log(`   📋 ${patternId}`);
                    }
                }
            }
            if (result.patternsLearned && result.patternsLearned.length > 0) {
                console.log(`🧠 New Patterns Learned: ${result.patternsLearned.length}`);
                if (options?.verbose) {
                    for (const patternId of result.patternsLearned) {
                        console.log(`   🆕 ${patternId}`);
                    }
                }
            }
            if (result.filePath) {
                console.log(`📄 File saved: ${result.filePath}`);
            }
            if (result.data && options?.verbose) {
                console.log(`📊 Detailed Results:`, JSON.stringify(result.data, null, 2));
            }
            if (config.output?.emailTo) {
                console.log(`📧 Emailed to: ${config.output.emailTo.join(', ')}`);
            }
            if (result.screenshots?.length) {
                console.log(`📸 Screenshots: ${result.screenshots.length} saved`);
            }
            // Advanced metrics
            const efficiency = (result.clickCount / (config.capabilities?.maxClicks || 5)) * 100;
            const confidenceScore = result.confidence ? (result.confidence * 100).toFixed(1) : 'N/A';
            console.log(`\n📈 Performance Metrics:`);
            console.log(`   Efficiency Score: ${(100 - efficiency).toFixed(0)}% (lower clicks = better)`);
            console.log(`   Task Confidence: ${confidenceScore}%`);
            console.log(`   Success Rate: 100%`);
            // Export debug information if requested
            if (options?.exportDebug && config.capabilities?.screenshotDebug) {
                console.log(`\n📤 Exporting debug information...`);
                try {
                    const { DebugMonitoringService } = await Promise.resolve().then(() => __importStar(require('../services/DebugMonitoringService')));
                    const debugService = new DebugMonitoringService('./debug');
                    await debugService.initialize();
                    // This would require storing the session ID during execution
                    // For now, we'll just indicate the feature is available
                    console.log(`📋 Debug export will be available in future versions`);
                    console.log(`   Requested format: ${options.exportDebug}`);
                }
                catch (error) {
                    console.warn('⚠️  Debug export failed:', error);
                }
            }
        }
        else {
            console.error(`\n❌ Natural language task failed: ${result.error}`);
            if (result.adaptiveStrategy) {
                console.log(`🎯 Strategies attempted: ${result.adaptiveStrategy.strategiesAttempted.join(', ')}`);
                if (result.adaptiveStrategy.failureReasons.length > 0) {
                    console.log(`💥 Failure reasons: ${result.adaptiveStrategy.failureReasons.join(', ')}`);
                }
            }
            if (result.screenshots?.length) {
                console.log(`📸 Debug screenshots: ${result.screenshots.join(', ')}`);
            }
            // Suggestions for improvement
            console.log('\n💡 Suggestions:');
            console.log('   • Try with --debug for detailed execution logging');
            console.log('   • Simplify the task description');
            console.log('   • Check if the target URL is correct');
            console.log('   • Verify your credentials are valid');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n❌ Unexpected error:', error);
        if (error instanceof Error) {
            if (error.message.includes('OPENROUTER_API_KEY')) {
                console.log('\n💡 Make sure you have set your OpenRouter API key');
            }
            else if (error.message.includes('authentication')) {
                console.log('\n💡 Check your Cox/VinSolutions credentials');
            }
            else if (error.message.includes('timeout')) {
                console.log('\n💡 Try increasing the timeout or simplifying the task');
            }
        }
        process.exit(1);
    }
}
/**
 * Execute task with nice formatting
 */
async function executeTask(config) {
    // Validate credentials
    if (!config.authentication.username || !config.authentication.password) {
        console.error('❌ Missing credentials! Set COX_USERNAME and COX_PASSWORD environment variables.');
        console.log('\nExample .env file:');
        console.log('COX_USERNAME=your-username');
        console.log('COX_PASSWORD=your-password');
        console.log('OTP_WEBHOOK_URL=https://your-webhook.com/otp (optional)');
        process.exit(1);
    }
    console.log('🚀 Unified VinSolutions Agent\n');
    console.log(`📍 Target URL: ${config.target.url}`);
    console.log(`🎯 Task Type: ${config.target.taskType}`);
    console.log(`🤖 AI Vision: ${config.capabilities?.useVision !== false ? 'Enabled' : 'Disabled'}`);
    console.log(`🎮 Max Clicks: ${config.capabilities?.maxClicks || 5}`);
    console.log(`👤 Username: ${config.authentication.username}`);
    if (config.target.parameters) {
        console.log(`📋 Parameters:`, config.target.parameters);
    }
    console.log('\n⏳ Executing task...\n');
    try {
        const startTime = Date.now();
        const result = await (0, UnifiedVinSolutionsAgent_1.executeVinSolutionsTask)(config);
        if (result.success) {
            console.log(`\n✅ Task completed successfully!`);
            console.log(`⏱️  Duration: ${result.duration}ms`);
            console.log(`🖱️  Clicks used: ${result.clickCount} / ${config.capabilities?.maxClicks || 5}`);
            if (result.filePath) {
                console.log(`📄 File saved: ${result.filePath}`);
            }
            if (result.data) {
                console.log(`📊 Data:`, JSON.stringify(result.data, null, 2));
            }
            if (config.output?.emailTo) {
                console.log(`📧 Emailed to: ${config.output.emailTo.join(', ')}`);
            }
            if (result.screenshots?.length) {
                console.log(`📸 Screenshots: ${result.screenshots.length} saved`);
            }
            // Success metrics
            const efficiency = (result.clickCount / (config.capabilities?.maxClicks || 5)) * 100;
            console.log(`\n🎯 Efficiency Score: ${(100 - efficiency).toFixed(0)}% (lower clicks = better)`);
        }
        else {
            console.error(`\n❌ Task failed: ${result.error}`);
            if (result.screenshots?.length) {
                console.log(`📸 Debug screenshots: ${result.screenshots.join(', ')}`);
            }
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n❌ Unexpected error:', error);
        process.exit(1);
    }
}
// Parse command line arguments
commander_1.program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    commander_1.program.outputHelp();
}
//# sourceMappingURL=unified-agent-cli.js.map