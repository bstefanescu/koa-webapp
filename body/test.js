const typeis = require('type-is');


function createRequest (type) {
    return {
      headers: {
        'content-type': type || undefined,
        'transfer-encoding': 'chunked'
      }
    }
  }

console.log(typeis(createRequest('text/xml'), 'text/*'));
console.log(typeis(createRequest('application/atom+json'), '+json'));
console.log(typeis(createRequest('application/json'), 'json'));
console.log(typeis(createRequest('application/atom+xml'), '+xml'));
console.log(typeis(createRequest('application/xml'), 'xml'));
console.log(typeis(createRequest('application/x-www-form-urlencoded'), 'urlencoded'));
console.log(typeis(createRequest('multipart/form-data'), 'multipart'));

console.log(typeis(createRequest('multipart/form-data; boundary=----WebKitFormBoundaryKllaEnFAT33uvWpu'), 'multipart'));
