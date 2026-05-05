import fetch from 'node-fetch';
fetch('http://localhost:3000/v1/auth/silent-verify/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'test' },
  body: JSON.stringify({ phoneNumber: '+33612345678', redirectUri: 'sentrapay://auth/callback' })
}).then(r => r.text()).then(console.log);
