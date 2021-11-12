export = Superuser;
declare const Superuser: SuperuserPrincipal;
/**
 * A special principal that can be used to act as a suoeruser.
 * This principal cannot be transformed into a JWT and is never send through web requests
 */
declare class SuperuserPrincipal {
    get name(): string;
    get isAnonymous(): boolean;
    get isSuperuser(): boolean;
    get isVirtual(): boolean;
    fromUser(userData: any): void;
    fromJWT(token: any): void;
    writeJWT(token: any): void;
}
