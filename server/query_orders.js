const db = require('./db.js');
db.all('SELECT id, status, customer_name, payment_method, user_id FROM orders WHERE id IN (4, 6)', [], (err, rows) => {
  if (err) { console.error(err); } else { console.log(rows); }
  process.exit();
});
