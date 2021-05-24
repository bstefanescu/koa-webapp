// */a/b
function prefixMatcher(pattern, strict) {
    // the leading * or + was removed from path
    // if strict the leading char was a + otherwise a *
    return strict ? path => {
        return path.endsWith(pattern) && path.length > pattern.length;
    } : path => {
        return path.endsWith(pattern);
    }
}

// a/b/*
function suffixMatcher(pattern, strict) {
    // the trailing * or + was removed from path
    // if strict the trailing char was a + otherwise a *
    let patternNoSlash;
    if (pattern.endsWith('/')) {
        if (!strict) {
            patternNoSlash = pattern.substring(0, pattern.length-1);
        }
    } else if (!srict) {
        patternNoSlash = pattern;
    }
    return patternNoSlash ? path => {
        return path === patternNoSlash || path.startsWith(pattern);
    } : path => {
        return path.startsWith(pattern);
    }
}

function createMatcher(pattern) {
    if (pattern.endsWith('*')) {
        return suffixMatcher(pattern.substring(0,pattern.length-1));
    } else if (pattern.endsWith('+')) {
        return suffixMatcher(pattern.substring(0,pattern.length-1), true); // match only children
    } else if (pattern.startsWith('*')) {
        return prefixMatcher(pattern.substring(1));
    } else if (pattern.startsWith('+')) {
        return prefixMatcher(pattern.substring(1), true); // doesn't match if pattern starts from begining of the path
    } else { // static
        return path => {
            if (!path.startsWith(pattern)) return false;
            if (path.length === pattern.length) return true;
            if (path.length !== pattern.length+1) return false;
            const c = path[pattern.length];
            return c === '/' || c === '?' || c === '#';
        };
    }
}

module.exports = createMatcher;