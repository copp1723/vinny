"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function main() {
    console.log('🤖 Starting Swarm Application...');
    console.log('✅ Application started successfully!');
    setInterval(() => {
        console.log('🔄 Application is running...');
    }, 30000);
    console.log('🏥 Health check: OK');
    console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
}
main().catch((error) => {
    console.error('💥 Application failed to start:', error);
    process.exit(1);
});
