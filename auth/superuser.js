/**
 * A special principal that can be used to act as a suoeruser.
 * This principal cannot be transformed into a JWT and is never send through web requests
 */
class SuperuserPrincipal {

    get name() {
        return '#superuser';
    }

    get isAnonymous() {
        return false;
    }

    get isSuperuser() {
        return true;
    }

    get isVirtual() {
        return true;
    }

    fromUser(userData) {
        throw new Error('Superuser principal is a virtual principal. It cannot be loaded from an user');
    }

    fromJWT(token) {
        throw new Error('Superuser principal is a virtual principal. It cannot be loaded from a JWT');
    }

    writeJWT(token) {
        throw new Error('Superuser principal is a virtual principal. It cannot be used as a JWT');
    }
}

const Superuser = new SuperuserPrincipal();
module.exports = Superuser;
