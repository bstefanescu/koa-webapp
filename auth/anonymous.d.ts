export = Anonymous;
declare const Anonymous: AnonymousPrincipal;
/**
 * A special principal that can be used to let unauthenticated users to access resources read only.
 * This principal cannot be transformed into a JWT and is never send through web requests
 */
declare class AnonymousPrincipal {
    get name(): string;
    get isAnonymous(): boolean;
    get isSuperuser(): boolean;
    get isVirtual(): boolean;
    fromUser(userData: any): void;
    fromJWT(token: any): void;
    writeJWT(token: any): void;
}
