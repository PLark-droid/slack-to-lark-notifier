#!/usr/bin/env node

import { LarkSlackBridge, configFromEnv } from '../index';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      await startBridge();
      break;
    case 'validate':
      await validateConfig();
      break;
    case 'status':
      showStatus();
      break;
    case 'version':
    case '-v':
    case '--version':
      console.log(`lark-slack-connector v${VERSION}`);
      break;
    case 'help':
    case '-h':
    case '--help':
    default:
      showHelp();
      break;
  }
}

async function startBridge(): Promise<void> {
  console.log('🚀 Starting Lark-Slack Connector...\n');

  try {
    // Load configuration from environment
    const config = configFromEnv();

    // Create and start bridge
    const bridge = new LarkSlackBridge({ config });

    // Set up event listeners
    bridge.on('bridge:connected', () => {
      console.log('✅ Bridge connected successfully');
    });

    bridge.on('bridge:forward', (event) => {
      const data = event.data as { direction: string };
      console.log(`📨 Message forwarded (${data.direction})`);
    });

    bridge.on('bridge:error', (event) => {
      const data = event.data as { direction: string; error: unknown };
      console.error(`❌ Error (${data.direction}):`, data.error);
    });

    // Handle shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      await bridge.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start the bridge
    await bridge.start();

    console.log('\n📊 Bridge Status:');
    const status = bridge.getStatus();
    console.log(`   Slack Workspaces: ${status.workspaces.length}`);
    console.log(`   Lark Connected: ${status.larkConnected ? 'Yes' : 'No'}`);
    console.log('\n💡 Press Ctrl+C to stop\n');

    // Keep process running
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Failed to start bridge:', error);
    process.exit(1);
  }
}

async function validateConfig(): Promise<void> {
  console.log('🔍 Validating configuration...\n');

  try {
    const config = configFromEnv();

    console.log('✅ Configuration is valid\n');
    console.log('📋 Configuration Summary:');
    console.log(`   Slack Workspaces: ${config.slack.workspaces.length}`);
    console.log(`   Socket Mode: ${config.slack.socketMode ? 'Enabled' : 'Disabled'}`);
    console.log(`   Lark Webhook: ${config.lark.webhookUrl ? 'Configured' : 'Not configured'}`);
    console.log(`   Lark App: ${config.lark.appId ? 'Configured' : 'Not configured'}`);

    if (config.channelMappings?.length) {
      console.log(`   Channel Mappings: ${config.channelMappings.length}`);
    }

    if (config.filters) {
      console.log('   Filters: Configured');
    }
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}

function showStatus(): void {
  console.log('ℹ️  Use "lark-slack-connector start" to run the bridge');
  console.log('   Status is only available while the bridge is running');
}

function showHelp(): void {
  console.log(`
lark-slack-connector v${VERSION}
Bidirectional message bridge between Slack and Lark

USAGE:
  lark-slack-connector <command>

COMMANDS:
  start       Start the bridge (uses environment variables for configuration)
  validate    Validate configuration from environment variables
  status      Show bridge status
  version     Show version
  help        Show this help message

ENVIRONMENT VARIABLES:
  Required for Slack:
    SLACK_BOT_TOKEN        Slack Bot User OAuth Token
    SLACK_SIGNING_SECRET   Slack App Signing Secret
    SLACK_APP_TOKEN        Slack App-Level Token (for Socket Mode)

  Required for Lark (one of):
    LARK_WEBHOOK_URL       Lark Incoming Webhook URL
    -- or --
    LARK_APP_ID            Lark App ID
    LARK_APP_SECRET        Lark App Secret

  Optional:
    SLACK_SOCKET_MODE      Enable Socket Mode (default: true)
    INCLUDE_CHANNELS       Comma-separated list of channels to include
    EXCLUDE_CHANNELS       Comma-separated list of channels to exclude
    CHANNEL_MAPPINGS       JSON array of channel mappings
    TIMEZONE               Timezone for timestamps (default: Asia/Tokyo)
    LOG_LEVEL              Log level: debug, info, warn, error (default: info)

EXAMPLES:
  # Start the bridge
  lark-slack-connector start

  # Validate configuration
  lark-slack-connector validate

  # With environment file
  source .env && lark-slack-connector start

DOCUMENTATION:
  https://github.com/PLark-droid/slack-to-lark-notifier/tree/main/packages/lark-slack-connector
`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
