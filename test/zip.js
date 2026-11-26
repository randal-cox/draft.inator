// A minimal zip writer for the tests: deflated entries, a central directory, and its end record.
import zlib from 'node:zlib';

export function zip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.isBuffer(text) || text instanceof Uint8Array ? Buffer.from(text) : Buffer.from(text), comp = zlib.deflateRawSync(data), nm = Buffer.from(name);
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(comp.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nm.length, 26);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(comp.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nm.length, 28); dir.writeUInt32LE(offset, 42);
    parts.push(head, nm, comp); central.push(dir, nm); offset += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, cd, end]));
}
