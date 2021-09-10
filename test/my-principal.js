const Principal = require('../auth/principal');

class MyPrincipal extends Principal {
    constructor(name) {
        super(name);
    }
    fromUser(user) {
        super.fromUser(user);
        this.email = user.email;
        return this;
    }
    fromJWT(token) {
        super.fromJWT(token);
        this.email = token.email;
        return this;
    }
    writeJWT(token) {
        super.writeJWT(token);
        token.email = this.email;
        return this;
    }
}
module.exports = MyPrincipal;
