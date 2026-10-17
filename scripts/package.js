/**
 * Threads 关键词过滤助手 - 纯原生跨平台插件打包脚本
 * 零第三方依赖，纯 Node.js 内置 API (fs, path, zlib)
 * 自动生成：
 * 1. dist/threads-filter-chrome-v1.0.4.zip
 * 2. dist/threads-filter-firefox-v1.0.4.zip (含 gecko id 与 Firefox WebExtension 专属配置)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// 读取根目录原始 manifest
const manifestRaw = fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8');
const baseManifest = JSON.parse(manifestRaw);
const version = baseManifest.version || '1.0.0';

// 包含打包的文件和目录列表
const INCLUDE_PATHS = [
  'background.js',
  'content.js',
  'content.css',
  'utils/text-normalizer.js',
  'utils/i18n.js',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'stats/stats.html',
  'stats/stats.css',
  'stats/stats.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  '_locales',
  'README.md'
];

/**
 * CRC32 快速计算
 */
let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

function calculateCrc32(buf) {
  const table = getCrcTable();
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * 格式化 DOS 时间
 */
function getDosDateTime(date = new Date()) {
  const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { dosTime, dosDate };
}

/**
 * 创建标准 ZIP 压缩包 Buffer
 * @param {Array<{ name: string, content: Buffer }>} files
 * @returns {Buffer}
 */
function createZipBuffer(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  const { dosTime, dosDate } = getDosDateTime();

  files.forEach(file => {
    const fileNameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const rawContent = file.content;
    const uncompressedSize = rawContent.length;
    const crc = calculateCrc32(rawContent);

    // 使用 zlib 进行 DeflateRaw 压缩
    const compressedData = zlib.deflateRawSync(rawContent, { level: 9 });
    const compressedSize = compressedData.length;

    // 1. Local File Header (30 字节 + 文件名长度 + 压缩数据)
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32BE(0x504b0304, 0); // 签名
    localHeader.writeUInt16LE(20, 4);         // 版本
    localHeader.writeUInt16LE(0, 6);          // 标志
    localHeader.writeUInt16LE(8, 8);          // 压缩方法 (8 = Deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // 2. Central Directory Header (46 字节 + 文件名长度)
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32BE(0x504b0102, 0); // 签名
    centralHeader.writeUInt16LE(20, 4);          // 制作版本
    centralHeader.writeUInt16LE(20, 6);          // 提取版本
    centralHeader.writeUInt16LE(0, 8);           // 标志
    centralHeader.writeUInt16LE(8, 10);          // 压缩方法
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);          // Extra field
    centralHeader.writeUInt16LE(0, 32);          // File comment
    centralHeader.writeUInt16LE(0, 34);          // Disk start
    centralHeader.writeUInt16LE(0, 36);          // Internal attrs
    centralHeader.writeUInt32LE(0, 38);          // External attrs
    centralHeader.writeUInt32LE(offset, 42);     // 本地头部相对偏移
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  });

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // 3. End of Central Directory Record (22 字节)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32BE(0x504b0506, 0);
  eocd.writeUInt16LE(0, 4);                     // 磁盘编号
  eocd.writeUInt16LE(0, 6);                     // 起始磁盘
  eocd.writeUInt16LE(files.length, 8);          // 本磁盘记录数
  eocd.writeUInt16LE(files.length, 10);         // 记录总数
  eocd.writeUInt32LE(centralDirSize, 12);       // 目录尺寸
  eocd.writeUInt32LE(centralDirOffset, 16);     // 目录起始偏移
  eocd.writeUInt16LE(0, 20);                    // 注释长度

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * 递归收集文件内容
 */
function collectBaseFiles() {
  const files = [];

  function addPath(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Warning] 缺少文件: ${relPath}`);
      return;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(fullPath);
      entries.forEach(entry => {
        addPath(path.join(relPath, entry));
      });
    } else {
      const content = fs.readFileSync(fullPath);
      files.push({ name: relPath, content });
    }
  }

  INCLUDE_PATHS.forEach(relPath => {
    addPath(relPath);
  });

  return files;
}

/**
 * 构建 Chrome 风格插件包
 */
function buildChromePackage() {
  console.log('\n📦 正在构建 Chrome 风格插件包...');
  const files = collectBaseFiles();

  // Chrome Manifest (纯净 Manifest V3)
  const chromeManifest = Object.assign({}, baseManifest);
  delete chromeManifest.browser_specific_settings;

  files.unshift({
    name: 'manifest.json',
    content: Buffer.from(JSON.stringify(chromeManifest, null, 2), 'utf8')
  });

  const zipBuffer = createZipBuffer(files);
  const outPath = path.join(DIST_DIR, `threads-filter-chrome-v${version}.zip`);
  fs.writeFileSync(outPath, zipBuffer);

  const kbSize = (zipBuffer.length / 1024).toFixed(1);
  console.log(`✅ [Chrome] 输出成功: ${outPath} (${kbSize} KB)`);
  return outPath;
}

/**
 * 构建 Firefox 风格插件包
 */
function buildFirefoxPackage() {
  console.log('\n🦊 正在构建 Firefox 风格插件包...');
  const files = collectBaseFiles();

  // Firefox 专属配置
  const firefoxManifest = Object.assign({}, baseManifest, {
    background: {
      scripts: ["background.js"]
    },
    browser_specific_settings: {
      gecko: {
        id: "threads-filter@extension.local",
        strict_min_version: "109.0"
      }
    }
  });

  files.unshift({
    name: 'manifest.json',
    content: Buffer.from(JSON.stringify(firefoxManifest, null, 2), 'utf8')
  });

  const zipBuffer = createZipBuffer(files);
  const zipPath = path.join(DIST_DIR, `threads-filter-firefox-v${version}.zip`);
  const xpiPath = path.join(DIST_DIR, `threads-filter-firefox-v${version}.xpi`);

  fs.writeFileSync(zipPath, zipBuffer);
  fs.writeFileSync(xpiPath, zipBuffer); // 同时提供 .xpi 格式，方便直接安装

  const kbSize = (zipBuffer.length / 1024).toFixed(1);
  console.log(`✅ [Firefox] 输出成功: ${zipPath} (${kbSize} KB)`);
  console.log(`✅ [Firefox XPI] 输出成功: ${xpiPath}`);
  return zipPath;
}

// 执行打包
function run() {
  console.log('==================================================');
  console.log(` Threads 关键词过滤助手 构建打包工具 (v${version})`);
  console.log('==================================================');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const chromeZip = buildChromePackage();
  const firefoxZip = buildFirefoxPackage();

  console.log('\n🎉 打包完成！构建产物位于 dist/ 目录：');
  console.log(`1. Chrome 插件包:  ${path.basename(chromeZip)}`);
  console.log(`2. Firefox 插件包: ${path.basename(firefoxZip)}`);
  console.log('==================================================\n');
}

run();
