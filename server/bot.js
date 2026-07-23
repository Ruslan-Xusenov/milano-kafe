require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token, { polling: true });

global.telegramVerificationCodes = {};

bot.on('message', (msg) => {
  const text = msg.text || '';
  
  if (text.startsWith('/start login')) {
    const message = `👋 Salom!\n\nTizimga kirish kodini olish uchun iltimos, pastdagi tugmani bosib telefon raqamingizni yuboring.`;
    bot.sendMessage(msg.chat.id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } 
  else if (text === '/start') {
    const message = `👋 Salom, *Milano Kafe* xizmatiga xush kelibsiz!\n\nMenyuni ko'rish va buyurtma berish uchun quyidagi tugmani bosing 👇`;
    
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
    
    global.telegramVerificationCodes[code] = {
      telegram_id: msg.from.id,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name,
      username: msg.from.username,
      phone: phoneNumber
    };
    
    const message = `✅ Raqam tasdiqlandi!\n\n🔑 Tizimga kirish kodingiz: *${code}*\n\nUshbu kodni ilovadagi tegishli maydonga kiriting.`;
    bot.sendMessage(msg.chat.id, message, { 
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
  }
});

const sendOrderToTelegram = (order) => {
  if (!chatId) {
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

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    .catch(err => console.error('Error sending message to Telegram:', err));
};

const sendStatusUpdateToTelegram = (orderId, newStatus) => {
  if (!chatId) return;

  const statusMap = {
    'preparing': 'Oshxonada tayyorlanmoqda 👨‍🍳',
    'delivering': 'Yo\'lda (Kuryer) 🛵',
    'completed': 'Yakunlandi ✅',
    'rejected': 'Rad etildi ❌'
  };

  const statusText = statusMap[newStatus] || newStatus;
  const message = `🔄 **Buyurtma #${orderId} holati o'zgardi**\n\nHolat: ${statusText}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    .catch(err => console.error('Error sending update message:', err));
};

const sendSecurityAlertToUser = (telegram_id, { device, os, location, time }) => {
  const message = `🚨 **XAVFSIZLIK OGOHLANTIRISHI**\n\nHurmatli foydalanuvchi, sizning hisobingizga yangi kirish aniqlandi!\n\n📱 Qurilma: ${device} (${os})\n📍 Yetkazib berish manzili (Kirish joyi): ${location}\n🕒 Vaqt: ${time}\n\nAgar bu siz bo'lmasangiz, darhol admin bilan bog'laning.`;
  
  bot.sendMessage(telegram_id, message, { parse_mode: 'Markdown' })
    .catch(err => console.error('Error sending security alert to user:', err));
};

module.exports = { bot, sendOrderToTelegram, sendStatusUpdateToTelegram, sendSecurityAlertToUser };
