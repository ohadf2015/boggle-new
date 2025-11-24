/**
 * Test script to verify SSR fixes for the LanguageProvider error
 */

const http = require('http');

const testUrls = [
    { path: '/', expected: 'redirect to locale' },
    { path: '/he', expected: 'Hebrew page' },
    { path: '/en', expected: 'English page' },
    { path: '/sv', expected: 'Swedish page' },
    { path: '/ja', expected: 'Japanese page' },
];

function testUrl(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'text/html',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const hasError = data.includes('useLanguage must be used within a LanguageProvider');
                const hasErrorDigest = data.includes('861702894');

                resolve({
                    path,
                    statusCode: res.statusCode,
                    hasLanguageProviderError: hasError,
                    hasErrorDigest,
                    success: !hasError && !hasErrorDigest && (res.statusCode === 200 || res.statusCode === 307)
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                path,
                error: error.message,
                success: false
            });
        });

        req.end();
    });
}

async function runTests() {
    console.log('Testing SSR for LanguageProvider fixes...\n');
    console.log('Make sure the Next.js server is running on port 3000\n');

    for (const { path, expected } of testUrls) {
        const result = await testUrl(path);

        console.log(`Testing ${path}:`);
        console.log(`  Status: ${result.statusCode || 'ERROR'}`);
        console.log(`  Has LanguageProvider Error: ${result.hasLanguageProviderError ? '❌ YES' : '✅ NO'}`);
        console.log(`  Has Error Digest: ${result.hasErrorDigest ? '❌ YES' : '✅ NO'}`);
        console.log(`  Result: ${result.success ? '✅ PASS' : '❌ FAIL'}`);

        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }

        console.log('');
    }
}

runTests().catch(console.error);