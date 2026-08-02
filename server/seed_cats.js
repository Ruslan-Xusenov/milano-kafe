const db = require('./db');

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

const seedCats = async () => {
  for (const [name, emoji] of Object.entries(imgUrls)) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO categories (name, emoji, available, is_quick) VALUES (?, ?, true, false) ON CONFLICT DO NOTHING`,
        [name, emoji],
        (err) => {
          if (err) {
            console.error(err);
            resolve(); // ignore errors
          } else resolve();
        }
      );
    });
    console.log(`${name} kategoriyasi qo'shildi.`);
  }
  console.log('Barcha kategoriyalar qo\'shildi!');
  process.exit(0);
};

seedCats();
