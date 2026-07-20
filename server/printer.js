const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

// POS printer konfiguratsiyasi
const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON, // Epson yoki yozuvchi qurilmaga mos
  interface: 'tcp://192.168.123.100', // Rasmdagi printer IP manzili
  characterSet: 'SLOVENIA', // Lotin alifbosini to'g'ri chiqarishi uchun
  removeSpecialCharacters: false,
  lineCharacter: "=",
});

const printReceipt = async (order) => {
  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.log('Printer ulanmagan. Iltimos .env faylida PRINTER_INTERFACE ni to\'g\'rilang.');
      // Agar kassa printeri real vaqtda ulanmagan bo'lsa xatoni oldini olish uchun
    }

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println("MILANO KAFE");
    printer.setTextSize(0, 0);
    printer.bold(false);
    printer.drawLine();
    
    printer.alignLeft();
    printer.println(`Buyurtma #${order.id}`);
    printer.println(`Sana: ${new Date().toLocaleString()}`);
    printer.println(`Mijoz: ${order.customer_name}`);
    printer.println(`Tel: ${order.phone}`);
    if (order.address && order.address !== 'Kiritilmagan') {
      printer.println(`Manzil: ${order.address}`);
    }
    printer.drawLine();

    // Taomlar ro'yxati
    let items = [];
    if (typeof order.items === 'string') {
        items = JSON.parse(order.items);
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

    if (isConnected) {
        await printer.execute();
        console.log(`Buyurtma #${order.id} muvaffaqiyatli chop etildi.`);
    } else {
        // Agar ulanmagan bo'lsa konsolga yozamiz
        console.log(`(Printer topilmadi) Chek matni: \n`, printer.getBuffer().toString());
    }
    
    printer.clear();

  } catch (error) {
    console.error("Chop etishda xatolik:", error);
  }
};

module.exports = { printReceipt };
