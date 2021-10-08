const crypto = require("crypto");

const bytes_to_key_results = {};

const EVP_BytesToKey = function (password, key_len, iv_len) {
  var count, d, data, i, iv, key, m, md5, ms;
  if (bytes_to_key_results["" + password + ":" + key_len + ":" + iv_len]) {
    return bytes_to_key_results["" + password + ":" + key_len + ":" + iv_len];
  }
  m = [];
  i = 0;
  count = 0;
  while (count < key_len + iv_len) {
    md5 = crypto.createHash("md5");
    data = password;
    if (i > 0) {
      data = Buffer.concat([m[i - 1], password]);
    }
    md5.update(data);
    d = md5.digest();
    m.push(d);
    count += d.length;
    i += 1;
  }
  ms = Buffer.concat(m);
  key = ms.slice(0, key_len);
  iv = ms.slice(key_len, key_len + iv_len);
  bytes_to_key_results[password] = [key, iv];
  return [key, iv];
};

const method_supported = {
  "aes-128-cfb": [16, 16],
  "aes-192-cfb": [24, 16],
  "aes-256-cfb": [32, 16],
  "bf-cfb": [16, 8],
  "camellia-128-cfb": [16, 16],
  "camellia-192-cfb": [24, 16],
  "camellia-256-cfb": [32, 16],
  "cast5-cfb": [16, 8],
  "des-cfb": [8, 8],
  "idea-cfb": [16, 8],
  "rc2-cfb": [16, 8],
  rc4: [16, 0],
  "seed-cfb": [16, 16],
};

function Encryptor(key, method) {
  this.key = key || "MVP123";
  this.method = method || "aes-256-cfb";
  if (!method_supported[this.method]) {
    throw Error("Not support method!");
  }
  const keyIV = this.getKeyIV(key, method);
  this._EVP_KEY = keyIV.key;
  this._IV = keyIV.iv;
}

Encryptor.prototype.get_cipher_len = function (method) {
  method = method.toLowerCase();
  return method_supported[method];
};

Encryptor.prototype.getKeyIV = function (password, method) {
  method = method.toLowerCase();
  password = Buffer.from(password, "binary");
  var m = this.get_cipher_len(method);
  var _ref = EVP_BytesToKey(password, m[0], m[1]);
  return { key: _ref[0], iv: _ref[1] };
};

Encryptor.prototype.encrypt = function (buf) {
  const cipher = crypto.createCipheriv(this.method, this._EVP_KEY, this._IV);
  let encrypted = cipher.update(buf);
  let result = cipher.final();

  let resultBuf = Buffer.concat([encrypted, result]);
  return resultBuf;
};

Encryptor.prototype.decrypt = function (buf) {
  let decipher = crypto.createDecipheriv(this.method, this._EVP_KEY, this._IV);
  let decrypted = decipher.update(buf);
  let result = decipher.final();
  return Buffer.concat([decrypted, result]);
};
exports.Encryptor = Encryptor;
