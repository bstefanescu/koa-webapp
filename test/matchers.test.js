const assert = require('assert');
const {createMatcher} = require('../router/matchers');


describe('Testing path matchers', () => {
    it('prefix match: /a/b/*', () => {
        const match = createMatcher('/a/b/*');
        assert.ok(match('/a/b'));
        assert.ok(match('/a/b/'));
        assert.ok(match('/a/b/c'));
        assert.ok(match('/a/b/c/d'));
        assert.ok(!match('/a/c/d'));
    });
    it('prefix match: /a/b/+', () => {
        const match = createMatcher('/a/b/+');
        assert.ok(!match('/a/b'));
        assert.ok(match('/a/b/'));
        assert.ok(match('/a/b/c'));
        assert.ok(match('/a/b/c/d'));
        assert.ok(!match('/a/c/d'));
    });
    it('suffix match: */a/b', () => {
        const match = createMatcher('*/a/b');
        assert.ok(match('/a/b'));
        assert.ok(match('/z/a/b'));
        assert.ok(!match('/a/b/c'));
    });
    it('suffix match: +/a/b', () => {
        const match = createMatcher('+/a/b');
        assert.ok(!match('/a/b'));
        assert.ok(match('/z/a/b'));
        assert.ok(!match('/a/b/c'));
    });
    it('regex match: /users/:userId/:tail*', () => {
        const match = createMatcher('/users/:userId/:tail*');
        assert.ok(match('/users/john'));
        assert.ok(match('/users/john/doe'));
        assert.ok(match('/users/john/doe/bla'));
        assert.ok(!match('/sudoers/john/doe/bla'));
    });

});
