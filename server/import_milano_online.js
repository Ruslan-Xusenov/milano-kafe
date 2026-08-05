const https = require('https');
const db = require('./db');

const FETCH_URL = 'https://www.milanofoods.online/api/menu';

function fetchMenuData() {
  return new Promise((resolve, reject) => {
    https.get(FETCH_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function runImport() {
  console.log('Fetching menu data from https://www.milanofoods.online/api/menu...');
  const data = await fetchMenuData();
  
  if (!data.categories || !data.products) {
    console.error('Invalid menu data structure!');
    process.exit(1);
  }
  
  // Sort by sort_order
  data.categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  data.products.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  console.log(`Received ${data.categories.length} categories and ${data.products.length} products.`);

  // Clear existing menu_items and categories first to ensure clean import
  await new Promise((resolve) => {
    db.run('TRUNCATE TABLE menu_items, categories, recipe_ingredients RESTART IDENTITY CASCADE', [], (err) => {
      if (err) {
        // Fallback to simple delete if truncate is unsupported (e.g., SQLite)
        db.run('DELETE FROM recipe_ingredients', [], () => {
          db.run('DELETE FROM menu_items', [], () => {
            db.run('DELETE FROM categories', [], () => resolve());
          });
        });
      } else {
        resolve();
      }
    });
  });

  const categoryMap = {}; // category_id -> name_uz

  // Insert categories
  for (let i = 0; i < data.categories.length; i++) {
    const cat = data.categories[i];
    const isQuick = i < 4; // Make first 4 categories quick categories on homepage
    categoryMap[cat.id] = cat.name_uz;

    await new Promise((resolve) => {
      const sql = `INSERT INTO categories (name, name_ru, emoji, available, is_quick) VALUES (?, ?, ?, ?, ?)`;
      db.run(sql, [
        cat.name_uz,
        cat.name_ru || '',
        cat.image_url || '',
        cat.is_active !== false,
        isQuick
      ], (err) => {
        if (err) console.error(`Error inserting category ${cat.name_uz}:`, err.message);
        resolve();
      });
    });
    console.log(`Added category: ${cat.name_uz} (${cat.name_ru || ''})`);
  }

  // Group variants by product_id
  const variantsByProd = {};
  if (data.variants && Array.isArray(data.variants)) {
    // Sort variants by sort_order or price
    data.variants.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.price - b.price));
    for (const v of data.variants) {
      if (v.is_available === false) continue;
      if (!variantsByProd[v.product_id]) variantsByProd[v.product_id] = [];
      variantsByProd[v.product_id].push({
        name: v.name_uz || '',
        name_ru: v.name_ru || v.name_uz || '',
        price: Number(v.price || 0)
      });
    }
  }

  // Insert products
  let count = 0;
  for (const prod of data.products) {
    const categoryName = categoryMap[prod.category_id] || 'Boshqa';
    const prodVariants = variantsByProd[prod.id] || [];
    let basePrice = Number(prod.price || 0);
    if (basePrice === 0 && prodVariants.length > 0) {
      basePrice = prodVariants[0].price;
    }

    await new Promise((resolve) => {
      const sql = `INSERT INTO menu_items (name, name_ru, description, description_ru, price, category, emoji, available, variants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      db.run(sql, [
        prod.name_uz,
        prod.name_ru || '',
        prod.description_uz || '',
        prod.description_ru || '',
        basePrice,
        categoryName,
        prod.image_url || '',
        prod.is_available !== false,
        JSON.stringify(prodVariants)
      ], (err) => {
        if (err) console.error(`Error inserting product ${prod.name_uz}:`, err.message);
        else count++;
        resolve();
      });
    });
  }

  console.log(`✅ Successfully imported ${data.categories.length} categories and ${count} products!`);
  process.exit(0);
}

runImport().catch(err => {
  console.error('Fatal import error:', err);
  process.exit(1);
});