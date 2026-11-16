'use strict';
(function (global) {
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function encodeName(name) {
    return new TextEncoder().encode(name);
  }

  var _decoder = null;
  function decodeUtf8(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      if (!_decoder) _decoder = new TextDecoder('utf-8');
      return _decoder.decode(bytes);
    }
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
  }

  function dosDateTime(d) {
    var year = d.getFullYear();
    if (year < 1980) year = 1980;
    if (year > 2107) year = 2107;
    var time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1F);
    var date = (((year - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
    return { time: time & 0xFFFF, date: date & 0xFFFF };
  }

  function toBytes(data) {
    if (typeof data === 'string') {
      return Promise.resolve(new TextEncoder().encode(data));
    }
    if (data instanceof Uint8Array) {
      return Promise.resolve(data);
    }
    if (data instanceof ArrayBuffer) {
      return Promise.resolve(new Uint8Array(data));
    }
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(data)) {
      return Promise.resolve(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    }
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data.arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
    }
    return Promise.reject(new Error('NTZip.create：不支持的数据类型，仅支持 string / Uint8Array / Blob'));
  }

  function create(files) {
    if (!Array.isArray(files)) {
      return Promise.reject(new Error('NTZip.create 需要一个 [{name, data}] 数组'));
    }
    var dt = dosDateTime(new Date());
    var jobs = [];
    for (var i = 0; i < files.length; i++) {
      (function (f) {
        jobs.push(Promise.resolve().then(function () {
          if (!f || typeof f.name !== 'string') throw new Error('NTZip.create：文件项缺少 name');
          return toBytes(f.data).then(function (bytes) {
            return { name: encodeName(f.name), bytes: bytes };
          });
        }));
      })(files[i]);
    }

    return Promise.all(jobs).then(function (entries) {
      var chunks = [];
      var central = [];
      var offset = 0;

      for (var a = 0; a < entries.length; a++) {
        var e = entries[a];
        var crc = crc32(e.bytes);
        var head = new Uint8Array(30 + e.name.length);
        var dv = new DataView(head.buffer);
        dv.setUint32(0, 0x04034b50, true);
        dv.setUint16(4, 20, true);
        dv.setUint16(6, 0x0800, true);
        dv.setUint16(8, 0, true);
        dv.setUint16(10, dt.time, true);
        dv.setUint16(12, dt.date, true);
        dv.setUint32(14, crc, true);
        dv.setUint32(18, e.bytes.length, true);
        dv.setUint32(22, e.bytes.length, true);
        dv.setUint16(26, e.name.length, true);
        dv.setUint16(28, 0, true);
        head.set(e.name, 30);

        chunks.push(head, e.bytes);
        central.push({ name: e.name, size: e.bytes.length, crc: crc, offset: offset });
        offset += head.length + e.bytes.length;
      }

      var cdOffset = offset;
      var cdSize = 0;

      for (var b = 0; b < central.length; b++) {
        var c = central[b];
        var cd = new Uint8Array(46 + c.name.length);
        var cdv = new DataView(cd.buffer);
        cdv.setUint32(0, 0x02014b50, true);
        cdv.setUint16(4, 0x0014, true);
        cdv.setUint16(6, 20, true);
        cdv.setUint16(8, 0x0800, true);
        cdv.setUint16(10, 0, true);
        cdv.setUint16(12, dt.time, true);
        cdv.setUint16(14, dt.date, true);
        cdv.setUint32(16, c.crc, true);
        cdv.setUint32(20, c.size, true);
        cdv.setUint32(24, c.size, true);
        cdv.setUint16(28, c.name.length, true);
        cdv.setUint16(30, 0, true);
        cdv.setUint16(32, 0, true);
        cdv.setUint16(34, 0, true);
        cdv.setUint16(36, 0, true);
        cdv.setUint32(38, 0, true);
        cdv.setUint32(42, c.offset, true);
        cd.set(c.name, 46);
        chunks.push(cd);
        cdSize += cd.length;
      }

      var eocd = new Uint8Array(22);
      var edv = new DataView(eocd.buffer);
      edv.setUint32(0, 0x06054b50, true);
      edv.setUint16(4, 0, true);
      edv.setUint16(6, 0, true);
      edv.setUint16(8, central.length, true);
      edv.setUint16(10, central.length, true);
      edv.setUint32(12, cdSize, true);
      edv.setUint32(16, cdOffset, true);
      edv.setUint16(20, 0, true);
      chunks.push(eocd);

      return new Blob(chunks, { type: 'application/zip' });
    });
  }

  function inflateRaw(bytes) {
    return new Promise(function (resolve, reject) {
      var unsupported = new Error('当前浏览器不支持 deflate-raw 解压（DecompressionStream 不可用），无法读取压缩的 ZIP 条目');
      if (typeof DecompressionStream !== 'function') {
        reject(unsupported);
        return;
      }
      var ds;
      try {
        ds = new DecompressionStream('deflate-raw');
      } catch (err) {
        reject(unsupported);
        return;
      }
      var stream;
      try {
        stream = new Blob([bytes]).stream().pipeThrough(ds);
      } catch (err2) {
        reject(new Error('解压 ZIP 条目失败'));
        return;
      }
      new Response(stream).arrayBuffer().then(function (buf) {
        resolve(new Uint8Array(buf));
      }).catch(function () {
        reject(new Error('解压 ZIP 条目失败（数据可能已损坏）'));
      });
    });
  }

  function read(blob) {
    if (!blob || typeof blob.arrayBuffer !== 'function') {
      return Promise.reject(new Error('NTZip.read 需要一个 Blob'));
    }
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var len = bytes.length;
      if (len < 22) throw new Error('不是有效的 ZIP 文件（太小）');
      var dv = new DataView(buf);

      var eocd = -1;
      var lowest = Math.max(0, len - 22 - 0xFFFF);
      for (var i = len - 22; i >= lowest; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) {
          var clen = dv.getUint16(i + 20, true);
          if (i + 22 + clen === len) { eocd = i; break; }
        }
      }
      if (eocd < 0) {
        for (var j = len - 22; j >= lowest; j--) {
          if (dv.getUint32(j, true) === 0x06054b50) { eocd = j; break; }
        }
      }
      if (eocd < 0) throw new Error('不是有效的 ZIP 文件（找不到中央目录结束记录）');

      var total = dv.getUint16(eocd + 10, true);
      var cdSize = dv.getUint32(eocd + 12, true);
      var cdOffset = dv.getUint32(eocd + 16, true);
      if (cdOffset > len || cdOffset + cdSize > len) throw new Error('ZIP 结构损坏（中央目录越界）');

      var pos = cdOffset;
      var list = [];
      for (var n = 0; n < total; n++) {
        if (pos + 46 > len) throw new Error('ZIP 结构损坏（中央目录项越界）');
        if (dv.getUint32(pos, true) !== 0x02014b50) throw new Error('ZIP 结构损坏（中央目录签名错误）');
        var method = dv.getUint16(pos + 10, true);
        var compSize = dv.getUint32(pos + 20, true);
        var nameLen = dv.getUint16(pos + 28, true);
        var extraLen = dv.getUint16(pos + 30, true);
        var commentLen = dv.getUint16(pos + 32, true);
        var localOff = dv.getUint32(pos + 42, true);
        if (pos + 46 + nameLen > len) throw new Error('ZIP 结构损坏（文件名越界）');
        list.push({
          name: decodeUtf8(bytes.subarray(pos + 46, pos + 46 + nameLen)),
          method: method,
          compSize: compSize,
          localOff: localOff
        });
        pos += 46 + nameLen + extraLen + commentLen;
      }

      var results = [];
      for (var m = 0; m < list.length; m++) {
        var it = list[m];
        if (it.localOff + 30 > len) throw new Error('ZIP 结构损坏（本地文件头越界）');
        if (dv.getUint32(it.localOff, true) !== 0x04034b50) throw new Error('ZIP 结构损坏（本地文件头签名错误）');
        var lNameLen = dv.getUint16(it.localOff + 26, true);
        var lExtraLen = dv.getUint16(it.localOff + 28, true);
        var dataStart = it.localOff + 30 + lNameLen + lExtraLen;
        if (dataStart + it.compSize > len) throw new Error('ZIP 结构损坏（条目数据越界）');
        var raw = bytes.subarray(dataStart, dataStart + it.compSize);

        if (it.method === 0) {
          results.push(Promise.resolve({ name: it.name, bytes: raw.slice() }));
        } else if (it.method === 8) {
          results.push(inflateRaw(raw).then((function (nm) {
            return function (b) { return { name: nm, bytes: b }; };
          })(it.name)));
        } else {
          throw new Error('ZIP 中使用了不支持的压缩方式：' + it.method);
        }
      }

      return Promise.all(results);
    });
  }

  global.NTZip = {
    create: create,
    read: read
  };
})(typeof window !== 'undefined' ? window : this);
