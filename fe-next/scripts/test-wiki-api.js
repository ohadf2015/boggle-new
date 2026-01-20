#!/usr/bin/env node
const https = require('https');

function fetchWikipedia(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function testAPI() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
  const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${dateStr}`;

  console.log('Testing Wikipedia API...');
  console.log('URL:', url);
  console.log('');

  try {
    const response = await fetchWikipedia(url);
    console.log('Response structure:');
    console.log(JSON.stringify(response, null, 2).substring(0, 2000));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
