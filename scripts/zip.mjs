import { deflateRawSync, inflateRawSync } from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function createZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, contents] of Object.entries(entries)) {
    const filename = Buffer.from(name);
    const input = Buffer.from(contents);
    const packed = deflateRawSync(input, { level: 9 });
    const checksum = crc32(input);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 6); // UTF-8 filenames
    local.writeUInt16LE(8, 8); // DEFLATE
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(input.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(input.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, filename, packed);
    centrals.push(central, filename);
    offset += local.length + filename.length + packed.length;
  }
  const centralSize = centrals.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
export function readZip(bytes) {
  const entries = {};
  let position = 0;
  while (position + 30 <= bytes.length && bytes.readUInt32LE(position) === 0x04034b50) {
    const method = bytes.readUInt16LE(position + 8);
    const checksum = bytes.readUInt32LE(position + 14);
    const compressedLength = bytes.readUInt32LE(position + 18);
    const uncompressedLength = bytes.readUInt32LE(position + 22);
    const nameLength = bytes.readUInt16LE(position + 26);
    const extraLength = bytes.readUInt16LE(position + 28);
    const name = bytes.subarray(position + 30, position + 30 + nameLength).toString();
    const start = position + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + compressedLength);
    const plain = method === 8 ? inflateRawSync(data) : data;
    if (plain.length !== uncompressedLength || crc32(plain) !== checksum) throw new Error(`ZIP integrity check failed: ${name}`);
    entries[name] = plain.toString();
    position = start + compressedLength;
  }
  return entries;
}
