const jwt = require('jsonwebtoken');
const secret = '4c054e8fb3dbdd80962e6ff6a29b961381a660e5022c0d41a387962a0bc3b5701bda9c976a8d98321af43d0664f211a117221a877cff422bdd2f1265c447bd5f';
const token = jwt.sign({ id: 13, role: 'client' }, secret);
console.log('Token:', token);

fetch('https://milano.securehub.uz/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    customer_name: "Test Client",
    phone: "+998901234567",
    items: [{id: 12, quantity: 1}],
    address: "Test address",
    cashback_used: 1000,
    payment_method: "click"
  })
}).then(r => r.json().then(data => ({status: r.status, data})))
  .then(res => console.log('Result:', res))
  .catch(e => console.log('Error:', e));
