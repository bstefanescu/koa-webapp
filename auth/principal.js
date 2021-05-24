
class Principal {

    constructor(name, userData) {
        this.name = name;
        this.isAnonymous = false;
        this.isAdmin = false;
        this.user = userData;
    }

    get role() {
        return this.user.role;
    }

    get email() {
        return this.user.email;
    }

}

module.exports = Principal;
