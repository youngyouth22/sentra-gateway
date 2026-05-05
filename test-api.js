const http = require('http');

const data = JSON.stringify({
  phoneNumber: "+33612345678",
  redirectUri: "sentrapay://auth/callback"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/v1/auth/silent-verify/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-key',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
