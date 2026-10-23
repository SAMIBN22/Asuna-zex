import 'dotenv/config';

const primaryOwnerIds = [
    // Add the primary bot owner IDs here only when they are not supplied elsewhere.
    '685448398077165578',
];

const secondOwnerIds = [
    // The second bot owner is allowed to use owner-only broadcast controls.
    '1197276485589942362',
];

const assistantIds = (process.env.ASSISTANT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d{15,20}$/.test(id));

const botOwnerIds = [...new Set([...primaryOwnerIds, ...secondOwnerIds])];
const botStaffIds = [...new Set([...primaryOwnerIds, ...assistantIds])];

export default {

    // ════════════════════════════════════════════════════════════════════
    //  🔑  إعدادات البوت الأساسية  —  REQUIRED
    // ════════════════════════════════════════════════════════════════════

    token: process.env.DISCORD_TOKEN || '',
    // ^ توكن البوت — يُقرأ من متغير البيئة DISCORD_TOKEN (Replit Secrets) أولاً.
    //   اضبطه في: Replit → Secrets → + New Secret → Key: DISCORD_TOKEN → Value: <توكنك>

    clientId: '1536404901599514684',
    // ^ Client ID من: Discord Developer Portal → General Information

    mongoURI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://CodeX:CodeX@codex-eu1.puo77ji.mongodb.net/?appName=CodeX-eu1',
    // ^ رابط قاعدة بيانات MongoDB Atlas — مثال: mongodb+srv://user:pass@cluster.mongodb.net/dbname

    // ════════════════════════════════════════════════════════════════════
    //  🤖  إعدادات الذكاء الاصطناعي  —  Gemini AI
    // ════════════════════════════════════════════════════════════════════

    geminiKey: '',
    // ^ مفتاح Gemini API من: aistudio.google.com/app/apikey

    geminiModel: 'gemini-2.0-flash',
    // ^ النموذج المستخدم — يمكنك تغييره إلى: gemini-1.5-pro

    geminiSystemPrompt: 'You are a helpful and professional Discord server assistant. Respond clearly, concisely, and in English unless the user asks for another language.',
    // ^ Default assistant personality and language

    // ════════════════════════════════════════════════════════════════════
    //  ⚙️  إعدادات عامة
    // ════════════════════════════════════════════════════════════════════

    prefix: '&',
    // ^ البادئة للأوامر النصية (مثال: & أو ! أو .)

    guildId: '',
    // ^ ID السيرفر الرئيسي (يُستخدم لنشر أوامر السلاش)

    autoImportProjectEmojis: false,
    // ^ الاستيراد التلقائي متوقف لأن بعض مراجع الإيموجيات القديمة لم تعد
    //   موجودة على Discord. استخدم &loademojis بعد توفير الملفات الأصلية.

    // Backward-compatible name used throughout the bot for privileged staff.
    // It includes the primary owners and configured assistants.
    devIds: botStaffIds,
    primaryOwnerIds,
    secondOwnerIds,
    botOwnerIds,
    assistantIds,
    botStaffIds,

    webhookUrl: '',
    // ^ رابط Webhook للسجلات (اختياري — اتركه فارغاً إن لم تحتج)

    sessionSecret: process.env.SESSION_SECRET,
    // ^ مفتاح تشفير الجلسات — يُقرأ تلقائياً من متغيرات البيئة (Secrets) ولا يُكتب هنا كنص صريح لأسباب أمنية

    // ════════════════════════════════════════════════════════════════════
    //  🎨  إيموجيات لوحة &help
    // ════════════════════════════════════════════════════════════════════

    supportServer: '',
    // ^ رابط سيرفر الدعم — غيّره هنا وسيتغير في جميع لوحات التحكم تلقائياً

    helpEmojis: {
        title:  '<a:15118311026863636481:1537427659863367700>',   // Main Help Menu and section icon
        star:   '<a:15118313460987332081:1537425814499364964>',   // Bullet icon for information rows
        folder: '<a:15118311026863636481:1537427659863367700>',   // Category option icon
    },
    // ^ غيّر الإيموجيات هنا فقط — ستتغير في &help تلقائياً
    // يمكنك وضع إيموجي عادي مثل 🎯 أو إيموجي مخصص من ديسكورد مثل: <a:اسم:ID>

    // ════════════════════════════════════════════════════════════════════
    //  🖼️  البانرات والمظهر
    // ════════════════════════════════════════════════════════════════════

    panelBanners: [
        'https://i.pinimg.com/originals/53/c8/8c/53c88c1383f3a873273b23a365006197.gif',
    ],
    // Shared banner used by all control panels and branded embeds.

    // لوحة تعريف البوت التي ينشئها الأمر &bot
    botPanel: {
        categoryName: '✦・BOT CENTER',
        channelName: '✦・bot-information',
        firstAnimatedImagePath: 'assets/images/divider.gif',
        secondAnimatedImagePath: 'assets/images/setup_divider.gif',
    },

    // ════════════════════════════════════════════════════════════════════
    //  ⏱️  حدود التهدئة (Cooldowns) — بالميللي ثانية
    // ════════════════════════════════════════════════════════════════════

    cooldowns: {
        // --- تهدئة افتراضية ---
        defaultUser:   3000,   // تهدئة المستخدم الواحد  (3 ثوانٍ)
        defaultGuild:  1000,   // تهدئة السيرفر          (1 ثانية)
        defaultGlobal: 500,    // تهدئة عامة             (0.5 ثانية)

        // --- تهدئة الأوامر بشكل منفرد ---
        commands: {
            BAN:             5000,
            KICK:            3000,
            CLEAR:           2000,
            LOCK:            2000,
            UNLOCK:          2000,
            WARN:            3000,
            UNWARN:          3000,
            WARNINGS:        2000,
            ADDROLE:        60000,
            TEMPROLE:        3000,
            JAIL:            5000,
            UNJAIL:          5000,
            SETJAIL:        10000,
            SETWARN:        10000,
            SETVERIFICATION:10000,
            SETNEEDHELP:    10000,
            SETICON:        10000,
            APPLY:           5000,
            ANTIBOT:         5000,
            ANTILINK:        5000,
            ANTIWEBHOOK:     5000,
            ANTITOKEN:       5000,
            ANTIGAIL:        5000,
            PCREATE:        15000,
            PLIMIT:         10000,
            PNAME:           5000,
            PROLE:           5000,
            PSETCATEGORY:   10000,
            PUSER:           3000,
            MANAGER:         5000,
            CASE:            2000,
            VB:              3000,
            VG:              3000,
            SUS:             5000,
            LBVERIF:         2000,
            VCLIST:          2000,
            VKICK:           3000,
            VMUTE:           3000,
            VDEAFEN:         3000,
            VUNMUTE:         3000,
            VUNDEAFEN:       3000,
            FIND:            2000,
            STATS:           2000,
            PING:            1000,
            HELP:            2000,
            BOTINFO:         3000,
            USERINFO:        2000,
            AVATAR:          2000,
            BANNER:          2000,
            ROLEINFO:        2000,
            HUG:             2000,
            KISS:            2000,
            SLAP:            2000,
            PAT:             2000,
            KILL:            2000,
            MEME:            3000,
            GIVEAWAY:       10000,
            GEDIT:           5000,
            GDELETE:         3000,
            GSTOP:           3000,
        },
    },

    // ════════════════════════════════════════════════════════════════════
    //  🚧  حدود الأوامر
    // ════════════════════════════════════════════════════════════════════

    limits: {
        maxMessagesClear:   100,       // أقصى عدد رسائل يمكن حذفها دفعة واحدة
        maxWarnings:          5,       // عدد الإنذارات قبل العقوبة التلقائية
        maxJailDuration:  86400000,    // أقصى مدة سجن  (24 ساعة بالميللي ثانية)
        maxMuteDuration:  86400000,    // أقصى مدة كتم  (24 ساعة بالميللي ثانية)
        maxBanReasonLength:  512,      // أقصى طول لسبب الحظر
        maxKickReasonLength: 512,      // أقصى طول لسبب الطرد
    },

    // ════════════════════════════════════════════════════════════════════
    //  ⏳  مهل الاستجابة (Timeouts) — بالميللي ثانية
    // ════════════════════════════════════════════════════════════════════

    timeouts: {
        commandExecution:    30000,   // وقت انتهاء تنفيذ الأمر      (30 ثانية)
        interactionResponse:  3000,   // وقت انتهاء الرد على تفاعل    (3 ثوانٍ)
        messageDelete:        5000,   // وقت حذف رسائل البوت التلقائية (5 ثوانٍ)
        embedDelete:         10000,   // وقت حذف الإيمبد التلقائي     (10 ثوانٍ)
    },

    // ════════════════════════════════════════════════════════════════════
    //  📊  حدود المعدل (Rate Limits)
    // ════════════════════════════════════════════════════════════════════

    rateLimits: {
        messagesPerMinute:  20,   // أقصى رسائل في الدقيقة للمستخدم
        commandsPerMinute:  10,   // أقصى أوامر في الدقيقة للمستخدم
        apiCallsPerSecond:   5,   // أقصى طلبات API في الثانية
    },

};
