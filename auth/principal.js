
class Principal {

    constructor(name, type) {
        this.name = name;
        this.userType = type || Principal.USER;
    }

    get isVirtual() {
        return this.userType !== Principal.USER;
    }

    fromUser(userData) {
        this.uid = userData.id;
        this.email = userData.email;
        this.nickname = userData.nickname || this.name;
        this.role = userData.role;
        this.groups = userData.groups;
        return this;
    }

    fromJWT(token) {
        this.name = token.sub;
        this.userType = token.userType;
        this.uid = token.userId;
        this.email = token.email;
        this.nickname = token.nickname || this.name;
        this.role = token.role;
        this.groups = token.groups;
        return this;
    }

    toJWT() {
        return {
            sub: this.name,
            userType: this.userType,
            uid: this.userId,
            email: this.email,
            nickname: this.nickname || this.name,
            role: this.role,
            groups: this.groups
        }
    }

}

Principal.ANONYMOUS = 1; // anonymous virt user
Principal.USER = 0; // regular user (backed by an user object)
Principal.ADMIN = 1; // amdin virt user

module.exports = Principal;
