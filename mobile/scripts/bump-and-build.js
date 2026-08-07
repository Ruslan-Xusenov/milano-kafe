#!/usr/bin/env node
/**
 * bump-and-build.js
 * Har safar build qilinganda versionCode va versionName ni avtomatik oshiradi,
 * so'ng Gradle bilan AAB yoki APK build qiladi.
 *
 * Ishlatish:
 *   node scripts/bump-and-build.js aab   → AAB (Play Store)
 *   node scripts/bump-and-build.js apk   → APK (to'g'ridan o'rnatish)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_GRADLE = path.join(__dirname, '../android/app/build.gradle');
const MOBILE_DIR   = path.join(__dirname, '..');
const OUTPUT_DIR   = path.join(__dirname, '../..');   // CafeBot root
const DESKTOP      = path.join(require('os').homedir(), 'Desktop');

const buildType = (process.argv[2] || 'aab').toLowerCase();
if (!['aab', 'apk'].includes(buildType)) {
  console.error('Usage: node scripts/bump-and-build.js [aab|apk]');
  process.exit(1);
}

// ── 1. Read build.gradle ──────────────────────────────────────────────────────
let gradle = fs.readFileSync(BUILD_GRADLE, 'utf8');

// ── 2. Parse current versions ─────────────────────────────────────────────────
const codeMatch = gradle.match(/versionCode\s+(\d+)/);
const nameMatch = gradle.match(/versionName\s+"(\d+)\.(\d+)\.(\d+)"/);

if (!codeMatch || !nameMatch) {
  console.error('❌  versionCode yoki versionName topilmadi!');
  process.exit(1);
}

const oldCode = parseInt(codeMatch[1], 10);
const [, major, minor, patch] = nameMatch.map((v, i) => i === 0 ? v : parseInt(v, 10));

// ── 3. Increment ──────────────────────────────────────────────────────────────
const newCode = oldCode + 1;
const newPatch = patch + 1;
const newName = `${major}.${minor}.${newPatch}`;

console.log(`\n📦  Version bump:`);
console.log(`    versionCode : ${oldCode} → ${newCode}`);
console.log(`    versionName : ${major}.${minor}.${patch} → ${newName}\n`);

// ── 4. Write updated build.gradle ─────────────────────────────────────────────
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${newCode}`)
  .replace(/versionName\s+"\d+\.\d+\.\d+"/, `versionName "${newName}"`);

fs.writeFileSync(BUILD_GRADLE, gradle, 'utf8');
console.log('✅  build.gradle yangilandi\n');

// ── 5. Run Gradle build ───────────────────────────────────────────────────────
const androidDir = path.join(MOBILE_DIR, 'android');

let gradleTask, outputSrc, outputDst, desktopFile;
if (buildType === 'aab') {
  gradleTask  = 'bundleRelease';
  outputSrc   = path.join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');
  outputDst   = path.join(MOBILE_DIR, 'app-release.aab');
  desktopFile = path.join(DESKTOP, `MilanoFoods-v${newName}.aab`);
} else {
  gradleTask  = 'assembleRelease';
  outputSrc   = path.join(androidDir, 'app/build/outputs/apk/release/app-release.apk');
  outputDst   = path.join(MOBILE_DIR, 'app-release.apk');
  desktopFile = path.join(DESKTOP, `MilanoFoods-v${newName}.apk`);
}

console.log(`🔨  Gradle ${gradleTask} boshlandi...\n`);
try {
  execSync(
    `./gradlew ${gradleTask} -PreactNativeArchitectures=arm64-v8a`,
    { cwd: androidDir, stdio: 'inherit' }
  );
} catch (err) {
  console.error('\n❌  Gradle build muvaffaqiyatsiz bo\'ldi!');
  // Version revert on failure
  gradle = gradle
    .replace(`versionCode ${newCode}`, `versionCode ${oldCode}`)
    .replace(`versionName "${newName}"`, `versionName "${major}.${minor}.${patch}"`);
  fs.writeFileSync(BUILD_GRADLE, gradle, 'utf8');
  console.log('⏪  Version qaytarildi (build xato bo\'lgani uchun)');
  process.exit(1);
}

// ── 6. Copy output files ──────────────────────────────────────────────────────
fs.copyFileSync(outputSrc, outputDst);
fs.copyFileSync(outputSrc, desktopFile);

const size = (fs.statSync(desktopFile).size / 1024 / 1024).toFixed(1);
console.log(`\n🎉  BUILD MUVAFFAQIYATLI!`);
console.log(`    Versiya  : v${newName} (code: ${newCode})`);
console.log(`    Hajm     : ${size} MB`);
console.log(`    Desktop  : ${desktopFile}`);
console.log(`    Loyiha   : ${outputDst}\n`);
