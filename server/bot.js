require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api').default || require('node-telegram-bot-api');
const tokenStore = require('./tokenStore');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN;
let chatIds = process.env.CHAT_ID ? process.env.CHAT_ID.split(',').map(id => id.trim()).filter(Boolean) : [];

const bot = new TelegramBot(token, { polling: true });

global.botUsername = null;

// Bot username ni olish
bot.getMe().then(me => {
  global.botUsername = me.username;
  console.log(`[bot] @${me.username} tayyor`);
}).catch(err => console.warn('[bot] getMe xatolik:', err.message));

bot.on('message', (msg) => {
  const text = msg.text || '';
  
  // Saytdan kelgan tokenli link yoki mobil ilovadan to'g'ridan-to'g'ri /start login
  if (text.startsWith('/start web_') || text === '/start login') {
    const askForPhone = () => {
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
      ).catch(err => console.error('[bot] sendMessage error:', err.message));
    };

    if (text === '/start login') {
      askForPhone();
    } else {
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
        askForPhone();
      }).catch(err => console.error('[bot] tokenStore.get error:', err.message));
    }
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

  // Admin Broadcast (/admin)
  const chatIdStr = msg.chat.id.toString();
  if (chatIds.includes(chatIdStr)) {
    if (!global.broadcastStates) global.broadcastStates = {};
    
    if (text === '/admin') {
      return bot.sendMessage(msg.chat.id, "👨‍💻 *Admin Panel*\n\nQuyidagi tugmalardan birini tanlang:", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "📈 Foydalanuvchilar soni", callback_data: "admin_users_count" }],
            [{ text: "📢 Barchaga xabar yuborish", callback_data: "admin_broadcast" }],
            [{ text: "👥 Adminlar ro'yxati", callback_data: "admin_list" }],
            [{ text: "➕ Yangi admin qo'shish", callback_data: "admin_add" }],
            [{ text: "🗑 Adminni o'chirish", callback_data: "admin_remove_prompt" }]
          ]
        }
      });
    }

    if (global.broadcastStates[chatIdStr]) {
      delete global.broadcastStates[chatIdStr];
      const db = require('./db');
      db.all('SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL', [], (err, users) => {
        if (err) return bot.sendMessage(msg.chat.id, "❌ Xatolik: " + err.message);
        if (!users || users.length === 0) return bot.sendMessage(msg.chat.id, "Bazada foydalanuvchilar topilmadi.");
        
        let successCount = 0;
        let failCount = 0;
        bot.sendMessage(msg.chat.id, `🚀 Tarqatish boshlandi. Jami foydalanuvchilar: ${users.length} ta...`);
        
        users.forEach((user, index) => {
          setTimeout(() => {
            bot.copyMessage(user.telegram_id, msg.chat.id, msg.message_id)
              .then(() => successCount++)
              .catch(() => failCount++)
              .finally(() => {
                if (index === users.length - 1) {
                  bot.sendMessage(msg.chat.id, `✅ Tarqatish tugadi!\n\n📤 Yetib bordi: ${successCount} ta\n❌ Xatolik (botni bloklaganlar): ${failCount} ta`);
                }
              });
          }, index * 50); // limit speed
        });
      });
      return;
    }

    if (global.addAdminStates && global.addAdminStates[chatIdStr]) {
      delete global.addAdminStates[chatIdStr];
      const newAdminId = text.trim();
      if (!/^\d+$/.test(newAdminId)) {
        return bot.sendMessage(msg.chat.id, "❌ Noto'g'ri ID format. Faqat raqamlardan iborat bo'lishi kerak.");
      }
      if (chatIds.includes(newAdminId)) {
        return bot.sendMessage(msg.chat.id, "⚠️ Bu foydalanuvchi allaqachon admin.");
      }
      
      chatIds.push(newAdminId);
      
      try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        const chatIdsString = chatIds.join(', ');
        if (envContent.includes('CHAT_ID=')) {
          envContent = envContent.replace(/CHAT_ID=.*/g, `CHAT_ID=${chatIdsString}`);
        } else {
          envContent += `\nCHAT_ID=${chatIdsString}`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
        bot.sendMessage(msg.chat.id, `✅ Yangi admin muvaffaqiyatli qo'shildi! (ID: ${newAdminId})`);
      } catch (err) {
        bot.sendMessage(msg.chat.id, "❌ .env faylga yozishda xatolik yuz berdi: " + err.message);
      }
      return;
    }
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

const escapeMarkdown = (text) => {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
};

const sendOrderToTelegram = (order) => {
  if (!chatIds || chatIds.length === 0) {
    console.error('CHAT_ID is not defined in .env');
    return;
  }

  const paymentTypeMap = {
    'naqd': 'Naqd pul',
    'karta': 'Plastik karta',
    'click': 'Click / Payme',
    'sovga': "Sovg'a"
  };
  const paymentType = paymentTypeMap[order.payment_method] || 'Naqd pul';

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.map(item => `- ${escapeMarkdown(item.name)} x${item.quantity} (${(item.price || 0).toLocaleString()} so'm)`).join('\n');
  const commentText = order.comment ? `\n📝 Izoh: ${escapeMarkdown(order.comment)}\n` : '';
  const message = `🔔 *YANGI BUYURTMA #${order.id}*\n\n` +
                  `👤 Mijoz: ${escapeMarkdown(order.customer_name)}\n` +
                  `📞 Telefon: ${escapeMarkdown(order.phone)}\n` +
                  `📍 Yetkazib berish manzili: ${escapeMarkdown(order.address)}\n` +
                  `💳 To'lov turi: ${escapeMarkdown(paymentType)}\n` +
                  commentText + `\n` +
                  `🛒 Buyurtmalar:\n${itemsText}\n\n` +
                  `💰 Jami: ${(order.total || 0).toLocaleString()} so'm\n\n` +
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
  const message = `🔄 *Buyurtma #${orderId} holati o'zgardi*\n\nHolat: ${escapeMarkdown(statusText)}`;

  chatIds.forEach(id => {
    bot.sendMessage(id, message, { parse_mode: 'Markdown' })
      .catch(err => console.error(`[bot] Status yangilash xatosi (${id}):`, err.message));
  });
};

const sendSecurityAlertToUser = (telegram_id, { device, os, location, time }) => {
  const message = `🚨 *XAVFSIZLIK OGOHLANTIRISHI*\n\nHurmatli foydalanuvchi, sizning hisobingizga yangi kirish aniqlandi!\n\n📱 Qurilma: ${escapeMarkdown(device)} (${escapeMarkdown(os)})\n📍 Yetkazib berish manzili (Kirish joyi): ${escapeMarkdown(location)}\n🕒 Vaqt: ${escapeMarkdown(time)}\n\nAgar bu siz bo'lmasangiz, darhol admin bilan bog'laning.`;
  
  bot.sendMessage(telegram_id, message, { parse_mode: 'Markdown' })
    .catch(err => console.error('[bot] Xavfsizlik xabarini yuborishda xato:', err.message));
};

bot.on('callback_query', (query) => {
  const chatIdStr = query.message.chat.id.toString();
  if (chatIds.includes(chatIdStr)) {
    if (query.data === 'admin_users_count') {
      const db = require('./db');
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) {
          bot.sendMessage(query.message.chat.id, "❌ Xatolik yuz berdi: " + err.message);
        } else {
          bot.sendMessage(query.message.chat.id, `📊 Loyihada jami *${row.count}* ta foydalanuvchi bor.`, { parse_mode: 'Markdown' });
        }
        bot.answerCallbackQuery(query.id);
      });
    }

    if (query.data === 'admin_broadcast') {
      if (!global.broadcastStates) global.broadcastStates = {};
      global.broadcastStates[chatIdStr] = true;
      bot.sendMessage(query.message.chat.id, "📣 Barcha foydalanuvchilarga tarqatish uchun xabarni yuboring (rasm, video yoki oddiy matn):");
      bot.answerCallbackQuery(query.id);
    }
    
    if (query.data === 'admin_add') {
      if (!global.addAdminStates) global.addAdminStates = {};
      global.addAdminStates[chatIdStr] = true;
      bot.sendMessage(query.message.chat.id, "➕ Yangi admin qilib tayinlanadigan foydalanuvchining Telegram ID raqamini yuboring:\n(Masalan: 123456789)");
      bot.answerCallbackQuery(query.id);
    }

    if (query.data === 'admin_list') {
      const listText = chatIds.length > 0 ? chatIds.map((id, index) => `${index + 1}. ${id}`).join('\n') : "Adminlar yo'q.";
      bot.sendMessage(query.message.chat.id, `📋 *Adminlar ro'yxati:*\n\n${listText}`, { parse_mode: 'Markdown' });
      bot.answerCallbackQuery(query.id);
    }
    
    if (query.data === 'admin_remove_prompt') {
      if (chatIds.length === 0) {
        return bot.answerCallbackQuery(query.id, { text: "Adminlar ro'yxati bo'sh.", show_alert: true });
      }
      const keyboard = chatIds.map(id => ([{ text: `❌ ${id}`, callback_data: `admin_remove_${id}` }]));
      bot.sendMessage(query.message.chat.id, "🗑 O'chirmoqchi bo'lgan adminni tanlang:", {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      bot.answerCallbackQuery(query.id);
    }

    if (query.data.startsWith('admin_remove_')) {
      const idToRemove = query.data.replace('admin_remove_', '');
      const index = chatIds.indexOf(idToRemove);
      if (index > -1) {
        chatIds.splice(index, 1);
        try {
          const envPath = path.join(__dirname, '.env');
          let envContent = fs.readFileSync(envPath, 'utf8');
          const chatIdsString = chatIds.join(', ');
          if (envContent.includes('CHAT_ID=')) {
            envContent = envContent.replace(/CHAT_ID=.*/g, `CHAT_ID=${chatIdsString}`);
          } else {
            envContent += `\nCHAT_ID=${chatIdsString}`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
          bot.sendMessage(query.message.chat.id, `✅ Admin o'chirildi: ${idToRemove}`);
        } catch (err) {
          bot.sendMessage(query.message.chat.id, "❌ Xatolik yuz berdi: " + err.message);
        }
      } else {
        bot.sendMessage(query.message.chat.id, "⚠️ Bu ID topilmadi.");
      }
      bot.answerCallbackQuery(query.id);
    }
  }
});

module.exports = { bot, sendOrderToTelegram, sendStatusUpdateToTelegram, sendSecurityAlertToUser };
