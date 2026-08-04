require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');
const tokenStore = require('./tokenStore');

const token = process.env.BOT_TOKEN;
const chatIds = process.env.CHAT_ID ? process.env.CHAT_ID.split(',').map(id => id.trim()).filter(Boolean) : [];

const bot = new TelegramBot(token, { polling: true });

global.botUsername = null;

// Bot username ni olish
bot.getMe().then(me => {
  global.botUsername = me.username;
  console.log(`[bot] @${me.username} tayyor`);
}).catch(err => console.warn('[bot] getMe xatolik:', err.message));

bot.on('message', (msg) => {
  const text = msg.text || '';
  
  // Faqat saytdan kelgan tokenli link orqali login — qo'lda "/start login" ishlamaydi
  if (text.startsWith('/start web_')) {
    const loginToken = text.replace('/start web_', '').trim();

    // DB-backed tokenStore (replaces global.telegramLoginTokens)
    tokenStore.get(loginToken, true).then(stored => {
      if (!stored) {
        return bot.sendMessage(msg.chat.id,
          '❌ Havola yaroqsiz yoki muddati o\'tgan.\n\nIltimos, saytga qaytib qaytadan urinib ko\'ring.',
          { parse_mode: 'Markdown' }
        );
      }

      // Token to'g'ri — telefon so'rash
      bot.sendMessage(msg.chat.id,
        `👋 Salom!\n\nTizimga kirish uchun telefon raqamingizni yuboring:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
      )
        .catch(err => console.error('[bot] sendMessage error:', err.message));
    }).catch(err => console.error('[bot] tokenStore.get error:', err.message));
  }
  else if (text === '/start') {
    const message = `👋 Salom, *Milano Foods* xizmatiga xush kelibsiz!\n\nMenyuni ko'rish va buyurtma berish uchun quyidagi tugmani bosing 👇`;
    
    bot.sendMessage(msg.chat.id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🍔 Kafega kirish", web_app: { url: "https://milano.securehub.uz" } }]
        ]
      }
    });
  }
  
  // Handle contact message
  if (msg.contact) {
    if (msg.contact.user_id !== msg.from.id) {
      return bot.sendMessage(msg.chat.id, '❌ Iltimos, o\'zingizning raqamingizni yuboring.');
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    let phoneNumber = msg.contact.phone_number;
    if (!phoneNumber.startsWith('+')) phoneNumber = '+' + phoneNumber;

    // DB-backed tokenStore (replaces global.telegramVerificationCodes)
    tokenStore.set(code, 'telegram_verify', {
      telegram_id: msg.from.id,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name,
      username: msg.from.username,
      phone: phoneNumber,
    }, 5 * 60 * 1000).catch(err => console.error('[bot] tokenStore.set error:', err.message));

    const message = `✅ Raqam tasdiqlandi!\n\n🔑 Tizimga kirish kodingiz: *${code}*\n\nUshbu kodni ilovadagi tegishli maydonga kiriting.`;
    bot.sendMessage(msg.chat.id, message, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
  }
});

const sendOrderToTelegram = (order) => {
  if (!chatIds || chatIds.length === 0) {
    console.error('CHAT_ID is not defined in .env');
    return;
  }

  const paymentTypeMap = {
    'naqd': 'Naqd pul',
    'karta': 'Plastik karta',
    'click': 'Click / Payme'
  };
  const paymentType = paymentTypeMap[order.payment_method] || 'Naqd pul';

  const itemsText = order.items.map(item => `- ${item.name} x${item.quantity} (${item.price.toLocaleString()} so'm)`).join('\n');
  const commentText = order.comment ? `\n📝 Izoh: ${order.comment}\n` : '';
  const message = `🔔 **YANGI BUYURTMA #${order.id}**\n\n` +
                  `👤 Mijoz: ${order.customer_name}\n` +
                  `📞 Telefon: ${order.phone}\n` +
                  `📍 Yetkazib berish manzili: ${order.address}\n` +
                  `💳 To'lov turi: ${paymentType}\n` +
                  commentText + `\n` +
                  `🛒 Buyurtmalar:\n${itemsText}\n\n` +
                  `💰 Jami: ${order.total.toLocaleString()} so'm\n\n` +
                  `🌐 Admin paneldan tasdiqlang.`;

  chatIds.forEach(id => {
    bot.sendMessage(id, message, { parse_mode: 'Markdown' })
      .catch(err => console.error(`[bot] Yuborishda xato (${id}):`, err.message));
  });
};

const sendStatusUpdateToTelegram = (orderId, newStatus) => {
  if (!chatIds || chatIds.length === 0) return;

  const statusMap = {
    'preparing': 'Oshxonada tayyorlanmoqda 👨‍🍳',
    'delivering': 'Yo\'lda (Kuryer) 🛵',
    'completed': 'Yakunlandi ✅',
    'rejected': 'Rad etildi ❌'
  };

  const statusText = statusMap[newStatus] || newStatus;
  const message = `🔄 **Buyurtma #${orderId} holati o'zgardi**\n\nHolat: ${statusText}`;

  chatIds.forEach(id => {
    bot.sendMessage(id, message, { parse_mode: 'Markdown' })
      .catch(err => console.error(`[bot] Status yangilash xatosi (${id}):`, err.message));
  });
};

const sendSecurityAlertToUser = (telegram_id, { device, os, location, time }) => {
  const message = `🚨 **XAVFSIZLIK OGOHLANTIRISHI**\n\nHurmatli foydalanuvchi, sizning hisobingizga yangi kirish aniqlandi!\n\n📱 Qurilma: ${device} (${os})\n📍 Yetkazib berish manzili (Kirish joyi): ${location}\n🕒 Vaqt: ${time}\n\nAgar bu siz bo'lmasangiz, darhol admin bilan bog'laning.`;
  
  bot.sendMessage(telegram_id, message, { parse_mode: 'Markdown' })
    .catch(err => console.error('[bot] Xavfsizlik xabarini yuborishda xato:', err.message));
};

module.exports = { bot, sendOrderToTelegram, sendStatusUpdateToTelegram, sendSecurityAlertToUser };
