/**
 * A special principal that can be used to let unauthenticated users to access resources read only.
 * This principal cannot be transformed into a JWT and is never send through web requests
 */
class AnonymousPrincipal {

    get name() {
        return '#anonymous';
    }

    get isAnonymous() {
        return true;
    }

    get isSuperuser() {
        return false;
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

const Anonymous = new AnonymousPrincipal();
module.exports = Anonymous;
