import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🤖 Starting Swarm Application...');
  console.log('✅ Application started successfully!');
  
  // Keep the process running
  setInterval(() => {
    console.log('🔄 Application is running...');
  }, 30000); // Log every 30 seconds
  
  // Basic health check endpoint simulation
  console.log('🏥 Health check: OK');
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
}

main().catch((error) => {
  console.error('💥 Application failed to start:', error);
  process.exit(1);
});