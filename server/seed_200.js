const sqlite3 = require('sqlite3');
const path = require('path');

const db = new sqlite3.Database(path.join(process.cwd(), 'cafebot.db'));

const categories = {
  "Sevimli": [
    "Osh Plov", "Qozon Kabob", "Manti", "Somsa", "Lag'mon", "Shashlik", "Norin", "Chuchvara", "Beshbarmoq", "Mastava", "Shorva", "Dimlama", "Kavob", "Gumma", "Tuxum Barak", "Qovurma Lag'mon", "Jiz", "Hasip", "Tandir Gusht", "Tabaka"
  ],
  "Chegirmalar": [
    "Kombo 1", "Kombo 2", "Maxsus Set", "Oilaviy Set", "Talaba Set", "Choyxona Set", "Katta Pitsa 50%", "Burger 2+1", "Shashlik Set", "Manti Set", "Shirinlik Seti", "Tushlik Set", "Kechki Set", "Mini Burger Set", "Hot Dog Set", "Limonad Set", "Pishiriq Set", "Gushtli Set", "Tovuqli Set", "Qahva + Shirinlik"
  ],
  "Tayyor ovqat": [
    "Bifshteks", "Kotlet", "Tovuq Qovurma", "Gulyash", "Teftel", "Qovurilgan Qanotlar", "Steyk", "Qovurilgan Baliq", "Osh tayyor", "Manti tayyor", "Somsa tayyor", "Shashlik tayyor", "Lag'mon tayyor", "Qozon kabob tayyor", "Norin tayyor", "Chuchvara tayyor", "Beshbarmoq tayyor", "Mastava tayyor", "Shorva tayyor", "Dimlama tayyor"
  ],
  "Mevalar": [
    "Olma", "Nok", "Uzum", "Banan", "Apelsin", "Mandarin", "Kivi", "Anor", "Anjir", "Xurmo", "Shaftoli", "O'rik", "Gilos", "Qulupnay", "Malina", "Qoragat", "Tarvuz", "Qovun", "Limon", "Mango"
  ],
  "Sut mahsulotlari": [
    "Sut 1L", "Qatiq 1L", "Qaymoq", "Tvorog", "Pishloq", "Sariyog'", "Qurut", "Kefir", "Smetana", "Muzqaymoq", "Ryajenka", "Tvorogli massa", "Pishloq (Golland)", "Pishloq (Mozzarella)", "Sut 1.5L", "Qatiq 1.5L", "Eritilgan pishloq", "Sutli shirinlik", "Sutli kokteyl", "Yogurt"
  ],
  "Non va pishiriqlar": [
    "Yopgan non", "Patir", "Lochira", "Samarqand non", "Buxoro non", "Tandir non", "Qora non", "Baton", "Bulocha", "Kruassan", "Keks", "Biskvit", "Pechenye", "Vafli", "Pryanik", "Korjik", "Pirojki", "Bulochka (murabboli)", "Bulochka (shokoladli)", "Eksler"
  ],
  "Suv va ichimliklar": [
    "Coca Cola 1L", "Fanta 1L", "Sprite 1L", "Pepsi 1L", "Mirinda 1L", "7Up 1L", "Suv (Gazsiz) 1L", "Suv (Gazli) 1L", "Sharbat (Olma)", "Sharbat (Apelsin)", "Sharbat (Gilos)", "Sharbat (Shaftoli)", "Choy (Qora)", "Choy (Ko'k)", "Qahva (Americano)", "Qahva (Latte)", "Qahva (Cappuccino)", "Limonad", "Moxito", "Kompot"
  ],
  "Shirinliklar": [
    "Shokolad", "Konfet", "Marmelad", "Zefir", "Karamel", "Iris", "Chupa Chups", "Snikers", "Tvix", "Mars", "Bounty", "Tort (Shokoladli)", "Tort (Mevali)", "Rulet", "Muzqaymoq (Shokoladli)", "Muzqaymoq (Plombir)", "Muzqaymoq (Mevali)", "Asal", "Murabbo", "Qiyom"
  ],
  "Go'sht mahsulotlari": [
    "Lahm go'sht", "Qovurg'a", "Qiyma", "Tovuq go'shti", "Mol go'shti", "Qo'y go'shti", "Kurka go'shti", "Baliq", "Kolbasa (Qaynatilgan)", "Kolbasa (Dudlangan)", "Sosiska", "Sardelka", "Balyk", "Qazi", "Hasip go'shti", "Jigar", "Yurak", "Buyrak", "Til", "Tuyoq"
  ],
  "Muzlatilgan": [
    "Muzlatilgan manti", "Muzlatilgan chuchvara", "Muzlatilgan somsa", "Muzlatilgan kotlet", "Muzlatilgan bifshteks", "Muzlatilgan teftel", "Muzlatilgan qanotlar", "Muzlatilgan baliq", "Muzlatilgan sabzavotlar", "Muzlatilgan mevalar", "Muzlatilgan rezavorlar", "Muzlatilgan xamir", "Muzlatilgan pitsa", "Muzlatilgan blinchik", "Muzlatilgan varenik", "Muzlatilgan fri", "Muzlatilgan naggetslar", "Muzlatilgan cheburek", "Muzlatilgan xinkali", "Muzlatilgan pelmen"
  ]
};

// Har bir toifa uchun mos premium rasmlar
const imgUrls = {
  "Sevimli": "https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=400&q=80",
  "Chegirmalar": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
  "Tayyor ovqat": "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
  "Mevalar": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  "Sut mahsulotlari": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
  "Non va pishiriqlar": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  "Suv va ichimliklar": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
  "Shirinliklar": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80",
  "Go'sht mahsulotlari": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400&q=80",
  "Muzlatilgan": "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?w=400&q=80"
};

const insertItem = (name, category, price, emoji) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO menu_items (name, description, price, category, emoji, available) VALUES (?, ?, ?, ?, ?, 1)`,
      [name, `Premium sifatli ${name.toLowerCase()}`, price, category, emoji],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

const seed = async () => {
  for (const [category, items] of Object.entries(categories)) {
    const emoji = imgUrls[category] || "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80";
    for (const item of items) {
      const price = Math.floor(Math.random() * 50) * 1000 + 10000; // 10k to 60k
      await insertItem(item, category, price, emoji);
    }
    console.log(`${category} toifasiga 20 ta mahsulot qo'shildi.`);
  }
  console.log('Barcha mahsulotlar muvaffaqiyatli qo\'shildi!');
  db.close();
};

seed();
