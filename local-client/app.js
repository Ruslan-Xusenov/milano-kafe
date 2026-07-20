const axios = require('axios');
const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

// Asosiy server manzili (milano.securehub.uz o'rnatilgach o'zgaradi)
const SERVER_URL = 'https://milano.securehub.uz'; 

// Mahalliy printer IP manzili
const PRINTER_INTERFACE = 'tcp://192.168.123.100';

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: PRINTER_INTERFACE,
  characterSet: 'SLOVENIA',
  removeSpecialCharacters: false,
  lineCharacter: "=",
});

const checkAndPrintJobs = async () => {
  try {
    const res = await axios.get(`${SERVER_URL}/api/print-jobs`);
    const jobs = res.data;

    if (jobs && jobs.length > 0) {
      console.log(`${jobs.length} ta yangi chop etilmagan buyurtma topildi.`);

      const isConnected = await printer.isPrinterConnected();
      if (!isConnected) {
        console.error(`Printer (${PRINTER_INTERFACE}) bilan aloqa yo'q!`);
        return;
      }

      for (let order of jobs) {
        console.log(`Buyurtma #${order.id} chop etilmoqda...`);
        
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("MILANO KAFE");
        printer.setTextSize(0, 0);
        printer.bold(false);
        printer.drawLine();
        
        printer.alignLeft();
        printer.println(`Buyurtma #${order.id}`);
        printer.println(`Sana: ${new Date(order.created_at).toLocaleString()}`);
        printer.println(`Mijoz: ${order.customer_name}`);
        printer.println(`Tel: ${order.phone}`);
        if (order.address && order.address !== 'Kiritilmagan') {
          printer.println(`Manzil: ${order.address}`);
        }
        printer.drawLine();

        let items = [];
        if (typeof order.items === 'string') {
            try { items = JSON.parse(order.items); } catch(e) {}
        } else {
            items = order.items;
        }

        items.forEach(item => {
          printer.leftRight(`${item.name} x${item.quantity}`, `${item.price * item.quantity} UZS`);
        });

        printer.drawLine();
        printer.bold(true);
        printer.leftRight("JAMI: ", `${order.total.toLocaleString()} UZS`);
        printer.bold(false);
        
        printer.drawLine();
        printer.alignCenter();
        printer.println("Xaridingiz uchun rahmat!");
        printer.println("Yoqimli ishtaha!");
        
        printer.cut();

        await printer.execute();
        printer.clear();

        // Serverga "Chop etildi" (done) deb xabar yuborish
        await axios.post(`${SERVER_URL}/api/print-jobs/${order.id}/done`);
        console.log(`Buyurtma #${order.id} muvaffaqiyatli chop etildi va serverda 'printed=1' qilindi.`);
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`Asosiy server (${SERVER_URL}) bilan ulanish imkonsiz.`);
    } else {
      console.error("Xatolik yuz berdi:", error.message);
    }
  }
};

console.log("Mahalliy Chop etish xizmati ishga tushdi...");
console.log(`Kuzatilayotgan printer: ${PRINTER_INTERFACE}`);
console.log(`Asosiy server: ${SERVER_URL}`);

// Har 3 soniyada serverni tekshirish
setInterval(checkAndPrintJobs, 3000);
