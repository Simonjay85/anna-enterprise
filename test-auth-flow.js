const http = require('http');

async function testAuth() {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const cookies = csrfRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0]).join('; ');
  
  const payload = new URLSearchParams({
    email: 'test1@company.com',
    password: 'password',
    csrfToken: csrfData.csrfToken,
    json: 'true',
  });
  
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: payload,
    redirect: 'manual'
  });
  
  const loginData = await loginRes.json();
  console.log("Login NextAuth JSON Output:", loginData);
  
  const sessionCookies = loginRes.headers.get('set-cookie');
  console.log("Session Cookies:", sessionCookies);
  
  const dashboardRes = await fetch('http://localhost:3000/', {
    headers: {
      'Cookie': sessionCookies ? sessionCookies.split(',').map(c => c.split(';')[0]).join('; ') : ''
    },
    redirect: 'manual'
  });
  
  console.log("Dashboard Status:", dashboardRes.status, dashboardRes.statusText);
  if (dashboardRes.status === 307) {
    console.log("Redirect Location:", dashboardRes.headers.get('location'));
  }
}

testAuth();
