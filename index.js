import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

import syncEmojis from './src/utils/syncEmojis.js';
import deployCommands from './src/utils/deployCommands.js';
import { ensureDir } from './src/utils/database.js';
import { c } from './src/utils/colors.js';
import { BRAND, BRAND_LINK } from './src/utils/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function banner() {
  console.log('');
  console.log(`  ${c.c1}${c.bold}${BRAND}${c.reset}`);
  console.log(`  ${c.muted}${BRAND_LINK}${c.reset}`);
  console.log(`  ${c.muted}discord.js v14  |  Components V2${c.reset}`);
  console.log('');
}

function collectFilesRecursive(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(join(dir, entry.name)));
    } else if (entry.name.endsWith('.js')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function collectFilesFlat(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => join(dir, name));
}

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('\n  [FATAL] DISCORD_TOKEN is not set — cannot start.\n');
  process.exit(1);
}

ensureDir();
banner();

try {
  await syncEmojis(TOKEN);
} catch (err) {
  console.error(`  ${c.red}${c.bold}[EMOJI]${c.reset}  ${c.red}sync crashed — ${err.message}${c.reset}`);
}

try {
  await deployCommands(TOKEN, process.env.DISCORD_CLIENT_ID);
} catch (err) {
  console.error(`  ${c.red}${c.bold}[DEPLOY]${c.reset}  ${c.red}deploy crashed — ${err.message}${c.reset}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel],
  // Shows the bot's status with the mobile "on phone" indicator. Purely
  // cosmetic — remove the `ws` block if you'd rather present as desktop.
  ws: { properties: { browser: 'Discord Android' } },
});

client.commands = new Collection();
client.prefixCommands = new Collection();

// -- Slash commands: src/commands/slash/**/*.js, each exporting { data, execute } --
for (const filePath of collectFilesRecursive(join(__dirname, 'src/commands/slash'))) {
  try {
    const command = (await import(pathToFileURL(filePath).href)).default;
    if (command?.data) client.commands.set(command.data.name, command);
  } catch (err) {
    console.error(`  ${c.red}${c.bold}[COMMAND LOAD FAILED]${c.reset}  ${c.white}${filePath}${c.reset}  ${c.red}${err.message}${c.reset}`);
  }
}

// -- Prefix (text) commands: src/commands/prefix/**/*.js, each exporting { prefix, execute } --
for (const filePath of collectFilesRecursive(join(__dirname, 'src/commands/prefix'))) {
  try {
    const command = (await import(pathToFileURL(filePath).href)).default;
    if (command?.prefix) client.prefixCommands.set(command.prefix, command);
  } catch (err) {
    console.error(`  ${c.red}${c.bold}[COMMAND LOAD FAILED]${c.reset}  ${c.white}${filePath}${c.reset}  ${c.red}${err.message}${c.reset}`);
  }
}

// -- Events + listeners: src/events/*.js and src/listeners/*.js, each exporting { name, once?, execute } --
for (const dir of ['src/events', 'src/listeners']) {
  for (const filePath of collectFilesFlat(join(__dirname, dir))) {
    try {
      const event = (await import(pathToFileURL(filePath).href)).default;
      if (!event?.name) continue;
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (err) {
      console.error(`  ${c.red}${c.bold}[EVENT LOAD FAILED]${c.reset}  ${c.white}${filePath}${c.reset}  ${c.red}${err.message}${c.reset}`);
    }
  }
}

client.login(TOKEN);

client.on('error', (err) => console.error(`  ${c.red}${c.bold}[WS ERROR]${c.reset}  ${err.message}`));
client.on('warn', (msg) => console.warn(`  ${c.c2}${c.bold}[WARN]${c.reset}  ${msg}`));

process.on('unhandledRejection', (err) => console.error(`  ${c.red}${c.bold}[UNHANDLED REJECTION]${c.reset}`, err));
process.on('uncaughtException', (err) => console.error(`  ${c.red}${c.bold}[UNCAUGHT EXCEPTION]${c.reset}  ${err.message}`));
