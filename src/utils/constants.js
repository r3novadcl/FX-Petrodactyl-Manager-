// Bot branding — shown in embeds, footers, and the console banner.
// Both are configurable via .env so this project can be re-skinned without
// touching source code.
export const BRAND = process.env.BOT_NAME || 'FX Development';
export const BRAND_LINK = process.env.BOT_SUPPORT_LINK || 'https://discord.gg/epKhYP6Y74';

// Embed accent color (Discord "blurple"-style default). Change freely.
export const ACCENT = 0x5865f2;
