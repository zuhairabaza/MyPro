const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const uploadedDir = path.join(projectRoot, 'uploaded');

function getRequestAttachmentUrl(fileName) {
    if (!fileName) return '';
    return '/uploaded/' + encodeURIComponent(fileName);
}

function buildPreviewUrl(photoUrl, identityUrl, billUrl) {
    // simulate admincp change: use encodeURI so slashes are preserved
    return `attachment-preview.html?photoUrl=${encodeURI(photoUrl)}&identityUrl=${encodeURI(identityUrl)}&billUrl=${encodeURI(billUrl)}`;
}

function formatUrl(value) {
    if (!value) return '';
    let v = String(value);
    try { v = decodeURIComponent(v); } catch (e) { }
    v = v.trim();
    if (/^%2F/i.test(v)) {
        try { v = decodeURIComponent(v); } catch (e) { }
    }
    if (v.startsWith('/')) {
        // in test we assume HTTP server; also provide local FS mapping
        return v;
    }
    return v;
}

function resolveToFsPath(resolvedUrl) {
    if (!resolvedUrl) return null;
    // Accept patterns: /uploaded/..., ./uploaded/..., uploaded/...
    let p = resolvedUrl.replace(/^\./, '');
    if (p.startsWith('/')) p = p.slice(1);
    return path.join(projectRoot, p);
}

function run() {
    if (!fs.existsSync(uploadedDir)) {
        console.error('uploaded directory not found:', uploadedDir);
        process.exit(1);
    }

    const files = fs.readdirSync(uploadedDir).filter(f => !f.startsWith('.'));
    if (files.length === 0) {
        console.error('No files in uploaded/ to test.');
        process.exit(1);
    }

    // try to pick by prefix
    const photo = files.find(f => f.toLowerCase().includes('photo')) || files[0];
    const identity = files.find(f => f.toLowerCase().includes('identity')) || files[1] || files[0];
    const bill = files.find(f => f.toLowerCase().includes('bill')) || files[2] || files[0];

    console.log('Found files in uploaded/:', files);
    console.log('Using:', { photo, identity, bill });

    const photoUrl = getRequestAttachmentUrl(photo);
    const identityUrl = getRequestAttachmentUrl(identity);
    const billUrl = getRequestAttachmentUrl(bill);

    const previewUrl = buildPreviewUrl(photoUrl, identityUrl, billUrl);
    console.log('\nPreview URL that admincp will open:');
    console.log(previewUrl);

    // Simulate what attachment-preview will receive by decoding the query params
    function getParam(q, key) {
        const m = q.match(new RegExp(`${key}=([^&]*)`));
        return m ? decodeURIComponent(m[1]) : '';
    }

    const q = previewUrl.split('?')[1] || '';
    const rawPhoto = getParam(q, 'photoUrl');
    const rawIdentity = getParam(q, 'identityUrl');
    const rawBill = getParam(q, 'billUrl');

    console.log('\nDecoded query params:');
    console.log({ rawPhoto, rawIdentity, rawBill });

    const resolvedPhoto = formatUrl(rawPhoto);
    const resolvedIdentity = formatUrl(rawIdentity);
    const resolvedBill = formatUrl(rawBill);

    console.log('\nAfter formatUrl normalization:');
    console.log({ resolvedPhoto, resolvedIdentity, resolvedBill });

    // Check filesystem existence
    [ ['photo', resolvedPhoto], ['identity', resolvedIdentity], ['bill', resolvedBill] ].forEach(([label, url]) => {
        const fsPath = resolveToFsPath(url);
        const exists = fsPath ? fs.existsSync(fsPath) : false;
        console.log(`\n${label}: url="${url}", fsPath="${fsPath}", exists=${exists}`);
    });
}

run();
