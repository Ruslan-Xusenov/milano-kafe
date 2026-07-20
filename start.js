import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Milano Kafe loyihasi ishga tushirilmoqda...\n');

// 1. Backend-ni ishga tushirish (Node.js)
console.log('📦 Backend server ishga tushirilmoqda...');
const backend = spawn('node', ['index.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// 2. Frontend-ni ishga tushirish (Vite)
console.log('🎨 Frontend server ishga tushirilmoqda...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Agar jarayonlardan biri xato bilan to'xtasa yoki yopilsa, ikkinchisini ham to'xtatish
const cleanup = () => {
  console.log('\n🛑 Jarayonlar to\'xtatilmoqda...');
  frontend.kill();
  backend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

frontend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Frontend jarayoni xatolik bilan to'xtadi (Kod: ${code})`);
    cleanup();
  }
});

backend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Backend jarayoni xatolik bilan to'xtadi (Kod: ${code})`);
    cleanup();
  }
});
