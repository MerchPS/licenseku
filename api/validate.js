const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { key, hwid } = req.query;
    
    console.log(`[REQ] Key: ${key?.substring(0, 15) || 'none'}`);

    // ============================================
    // VALIDASI KEY TANPA BACA FILE DULU (BUAT TEST)
    // ============================================
    
    if (!key) {
        return res.json({ valid: false, error: 'No key' });
    }

    // Hardcode dulu buat test - nanti ganti ke file
    const VALID_KEYS = {
        'HXS-2024-A1B2C3D4': { owner: 'Customer 1', expiry: '2025-12-31' },
        'HXS-2024-X9Y8Z7W6': { owner: 'Customer 2', expiry: '2026-06-30' },
    };
    
    const BLOCKED_KEYS = ['HXS-OLD-LEAKED-KEY1', 'HXS-OLD-LEAKED-KEY2'];

    // Cek blocked
    if (BLOCKED_KEYS.includes(key)) {
        return res.json({ valid: false, reason: 'blocked' });
    }

    // Cek valid
    const license = VALID_KEYS[key];
    
    if (!license) {
        return res.json({ valid: false, reason: 'not_found' });
    }

    // ✅ VALID - RETURN 403
    return res.status(403).json({
        valid: true,
        owner: license.owner,
        expiry: license.expiry,
        hwid_bound: false,
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
};
