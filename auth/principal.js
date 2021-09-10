/**
 * The Base class of a principal. An application will usually want to extends this one
 * to control which user properties are stored on the principal and
 * how they are mapped on the JWT corresponding to the principal.
 *
 * This implementation will assume the User object contains an 'id', 'nickname' and
 * a 'role' property and will import these as properties on the principal.
 * When writing down the JWT corresponding to the principal the 'id' is mapped as the 'user' claim and the
 * nickname and role are preserved as is. The oposite is done when initializing the principal from a JWT token.
 *
 * The name is always mapped as the JWT sub claim.
 *
 * Minimal set of properties of a principal:
 * 1. `name`
 * 2. `isAnonymous`
 * 3. `isSuperuser`
 * 4. `isVirtual`
 *
 * Methods that should be implemented if extended:
 * `fromUser(userData)`
 * `fromJWT(token)`
 * `writeJWT(token)`
 */
class Principal {

    constructor(name) {
        if (!name) throw new Error('Expecting a name for the Principal');
        this.name = name;
    }

    get isVirtual() {
        return false;
    }

    get isSuperuser() {
        return false;
    }

    get isAnonymous() {
        return false;
    }

    /**
     * Initialize the principal from the given user
     * @param {*} userData
     * @returns
     */
    fromUser(userData) {
        this.id = userData.id;
        this.nickname = userData.nickname;
        this.role = userData.role;
        return this;
    }

    /**
     * Initialize the principal from the given JWT
     * @param {*} token
     * @returns
     */
    fromJWT(token) {
        this.id = token.user;
        this.nickname = token.nickname;
        this.role = token.role;
        return this;
    }

    /**
     * Write the JWT fields for this principal
     * @param {*} token
     * @returns
     */
    writeJWT(token) {
        token.user = this.id;
        token.nickname = this.nickname;
        token.role = this.role;
        return this;
    }

}

module.exports = Principal;
