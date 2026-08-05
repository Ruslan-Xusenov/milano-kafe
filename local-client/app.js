const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

// --- 1. Konfiguratsiya (config.json dan yoki default sozlamalar) ---
let config = {
  serverUrl: process.env.SERVER_URL || 'https://milano.securehub.uz',
  printerInterface: process.env.PRINTER_INTERFACE || 'tcp://192.168.123.100',
  printerSecret: process.env.PRINTER_SECRET || 'ede3d6fc2e5381127ddef2582d2373841aba683473be8b30de7405c52e3d365d',
  qrUrl: "https://t.me/zara_marketbot",
  pollIntervalMs: 3000
};

const configPath = path.join(process.cwd(), 'config.json');
try {
  if (fs.existsSync(configPath)) {
    const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...localConfig };
    console.log("✔️ Sozlamalar mahalliy config.json faylidan yurgizildi:");
  } else {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log("✔️ Yangi config.json fayli yaratildi. Biron narsani o'zgartirish kerak bo'lsa, shu fayldan tahrir qilsangiz bo'ladi.");
  }
} catch (err) {
  console.log("⚠️ config.json ni o'qiylashda xatolik yuz berdi (standart qiymat faolligicha qoladi):", err.message);
}

axios.defaults.headers.common['X-Printer-Token'] = config.printerSecret;

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: config.printerInterface,
  characterSet: 'SLOVENIA',
  removeSpecialCharacters: false,
  lineCharacter: "=",
  width: 48, // 80mm ESC/POS kassa chek printeri uchun standart 48-qatorli harf kengligi
});

// O'tkazib kelingan va 3 marta bip bilan ogohlantirilgan buyurtmalar ro'yxati
const alertedOrderIds = new Set();

const checkAndPrintJobs = async () => {
  try {
    const res = await axios.get(`${config.serverUrl}/api/orders/print-jobs`);
    const jobs = res.data;

    if (jobs && jobs.length > 0) {
      // 1. "new" holatidagi yangi buyurtmalar (Ovoz bilan 3 marta BIP qip ogohlantiradiganlar)
      const newOrders = jobs.filter(o => o.status === 'new');
      const unalertedOrders = newOrders.filter(o => !alertedOrderIds.has(o.id));

      if (unalertedOrders.length > 0) {
        console.log(`\n🔔 ${unalertedOrders.length} ta yangi tushgan buyurtma topildi! Kassa printeriga 3 ta BEEP (ogoylik uldanadi) jo'natildi.`);
        const isConnected = await printer.isPrinterConnected();
        if (isConnected) {
          // 3 marta BEEP ovoz chiqarish (3 ta beep, har birining uzilib chalinadigan ton muddati = 2)
          printer.beep(3, 2);
          await printer.execute();
          printer.clear();

          unalertedOrders.forEach(o => alertedOrderIds.add(o.id));
          console.log(`✔️ Ovozli ogohlantirish berildi: ${unalertedOrders.map(o => '#' + o.id).join(', ')}`);
        } else {
          console.error(`❌ Printer (${config.printerInterface}) ulanolmayotganligi uchun BEEP ovoz berilolmay turibdi!`);
        }
      }

      // 2. "preparing" holatidagi buyurtmalar (Admin yoki oshpaz ko'rib tasdiqlab o'tkazgan — ENDI chek chop qilsak BO'LADI)
      const preparingOrders = jobs.filter(o => o.status === 'preparing');

      if (preparingOrders.length > 0) {
        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
          console.error(`❌ Chop etish uchun printer (${config.printerInterface}) bilan uzoqda aloqa uzildi (ulanish yo'q)!`);
          return;
        }

        for (let order of preparingOrders) {
          console.log(`\n🖨️ Tasdiqlandi! Buyurtma #${order.id} cheki chop etish jarayoniga o'tishmoqda...`);
          
          printer.alignCenter();
          printer.bold(true);
          printer.setTextSize(1, 1);
          printer.println("MILANO FOODS");
          printer.setTextSize(0, 0);
          printer.bold(false);
          printer.drawLine();
          
          printer.alignLeft();
          printer.println(`Buyurtma #${order.id}`);
          printer.println(`Sana: ${new Date(order.created_at || Date.now()).toLocaleString()}`);
          printer.println(`Mijoz: ${order.customer_name}`);
          printer.println(`Tel: ${order.phone}`);
          if (order.address && order.address !== 'Kiritilmagan') {
            printer.println(`Manzil: ${order.address}`);
          }
          if (order.comment) {
            printer.println(`Izoh: ${order.comment}`);
          }
          printer.drawLine();

          let items = [];
          if (typeof order.items === 'string') {
              try { items = JSON.parse(order.items); } catch(e) {}
          } else {
              items = order.items || [];
          }

          items.forEach(item => {
            printer.leftRight(`${item.name} x${item.quantity}`, `${(item.price * item.quantity).toLocaleString()} UZS`);
          });

          printer.drawLine();
          printer.bold(true);
          printer.leftRight("JAMI: ", `${(order.total || 0).toLocaleString()} UZS`);
          printer.bold(false);
          
          printer.drawLine();
          printer.alignCenter();
          printer.println("Xaridingiz uchun rahmat!");
          printer.println("Yoqimli ishtaha!");
          
          if (config.qrUrl) {
            printer.newLine();
            printer.printQR(config.qrUrl, { cellSize: 6, correction: 'M' });
            printer.println("Qayta buyurtma uchun skanerlang!");
            printer.newLine();
          }
          
          printer.cut();

          await printer.execute();
          printer.clear();

          // Serverga "Chop etildi" deb xabar yuboramiz
          await axios.post(`${config.serverUrl}/api/orders/print-jobs/${order.id}/done`);
          console.log(`✔️ Buyurtma #${order.id} muvaffaqiyatli chop etildi (serverda 'printed=1' qilindi).`);
          
          alertedOrderIds.delete(order.id);
        }
      }

      // Memory cleanup
      if (alertedOrderIds.size > 500) {
        const activeIds = new Set(jobs.map(j => j.id));
        for (let id of alertedOrderIds) {
          if (!activeIds.has(id)) alertedOrderIds.delete(id);
        }
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`⚠️ Asosiy server (${config.serverUrl}) ga ulanish imkonsiz (internet yoki manzilni tekshiring).`);
    } else {
      console.error("⚠️ Xatolik yuz berdi:", error.message || error);
    }
  }
};

console.log("==================================================");
console.log("🏪 MILANO FOODS — MAHALLIY KASSA PRINTER XIZMATI");
console.log("==================================================");
console.log(`🔌 Kuzatilmoqidagi Printer: ${config.printerInterface}`);
console.log(`💡 (Eslatma: LAN tarmoqda tcp://192.168.123.100 ishlash uchun eng barqaror marshrutdir)`);
console.log(`💡 (Agar faqat USB orqali yurgizmasdan foydalansa, config.json ichida printer nomiga e'tibor qarating)`);
console.log(`🌐 Asosiy Server: ${config.serverUrl}`);
console.log(`⏱️ Tekshiruv intervali: har ${config.pollIntervalMs / 1000} soniyada`);
console.log("==================================================\n");
console.log("Kassa Chop Etuvchi (BEEP va Chek Keskich bilan moslantirilgan) ishga tuydi. Kutildi...\n");

setInterval(checkAndPrintJobs, config.pollIntervalMs);
checkAndPrintJobs(); // Dastlab uzoqsarsiz bitta aql kuchi sinagich bilar tashiymiz
