const db = require('./server/db');
db.run("UPDATE menu_items SET discount_percent=10 WHERE category='Burger'", function(err) {
  console.log('changes:', this.changes);
});
