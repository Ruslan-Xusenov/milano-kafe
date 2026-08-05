const db = require('./db');
const bcrypt = require('bcryptjs');

const updateAdmin = async () => {
  const hash = bcrypt.hashSync('admin123', 10);
  db.run("UPDATE staff SET password = $1 WHERE username = 'admin'", [hash], (err) => {
    if (err) console.error(err);
    else console.log("Admin password updated successfully!");
    process.exit(0);
  });
};

updateAdmin();