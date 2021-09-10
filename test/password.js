const crypto = require('crypto');

function hash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}
function verifyPassword(user, password) {
    return user.password && hash(password) === user.password;
}

const p1 = hash('Bar');
const p2 = hash('Bar');

module.exports = {verifyPassword, hash}
