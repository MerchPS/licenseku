const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================
// LICENSE VALIDATOR - HXS SCRIPTS
// ============================================

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Load database license
        const dbPath = path.join(__dirname, '..', 'data', 'licenses.json');
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const database = JSON.parse(rawData);

        // Cek maintenance mode
        if (database.settings.maintenance) {
            return res.status(503).json({
                status: 503,
                valid: false,
                error: 'Server dalam maintenance',
                message: database.settings.message || 'Silakan coba lagi nanti'
            });
        }

        // Ambil parameter
        const { key, hwid, timestamp } = req.query;
        const userAgent = req.headers['user-agent'] || '';

        // Log request (optional)
        console.log(`[${new Date().toISOString()}] Request: ${key?.substring(0, 10)}... | ${hwid?.substring(0, 10)}...`);

        // Validasi input
        if (!key) {
            return res.status(400).json({
                status: 400,
                valid: false,
                error: 'License key diperlukan'
            });
        }

        // Cek blocklist
        if (database.blocked.includes(key)) {
            console.log(`⛔ Blocked key: ${key}`);
            return res.status(200).json({
                status: 200,
                valid: false,
                error: 'License telah diblokir',
                reason: 'blocked'
            });
        }

        // Cari license
        const license = database.valid.find(l => l.key === key);

        if (!license) {
            console.log(`❌ Invalid key: ${key}`);
            return res.status(200).json({
                status: 200,
                valid: false,
                error: 'License tidak valid',
                reason: 'not_found'
            });
        }

        // Cek status aktif
        if (!license.active) {
            console.log(`🔒 Inactive key: ${key}`);
            return res.status(200).json({
                status: 200,
                valid: false,
                error: 'License dinonaktifkan',
                reason: 'inactive'
            });
        }

        // Cek expired
        const now = new Date();
        const expiry = new Date(license.expiry);
        
        if (now > expiry) {
            console.log(`⏰ Expired key: ${key}`);
            return res.status(200).json({
                status: 200,
                valid: false,
                error: 'License telah expired',
                reason: 'expired',
                expiredAt: license.expiry
            });
        }

        // Cek HWID lock (jika di-set)
        if (license.hwid && hwid) {
            if (license.hwid !== hwid) {
                console.log(`🖥️ HWID mismatch: ${key}`);
                return res.status(200).json({
                    status: 200,
                    valid: false,
                    error: 'License terikat ke perangkat lain',
                    reason: 'hwid_mismatch'
                });
            }
        }

        // ============================================
        // LISENSI VALID → RETURN 403 (SESUAI LOGIC BOT)
        // ============================================
        console.log(`✅ Valid key: ${key} | Owner: ${license.owner}`);
        
        const responseData = {
            status: 403,
            valid: true,
            owner: license.owner,
            expiry: license.expiry,
            version: database.settings.version,
            features: [
                'multi_worker',
                'auto_join',
                'scraper',
                'jpm'
            ],
            timestamp: new Date().toISOString()
        };

        // Jika ada HWID, simpan (first time bind)
        if (hwid && !license.hwid) {
            license.hwid = hwid;
            fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
            responseData.hwid_bound = true;
            console.log(`🔗 HWID bound: ${key} → ${hwid}`);
        }

        return res.status(403).json(responseData);

    } catch (error) {
        console.error('❌ Server error:', error);
        return res.status(500).json({
            status: 500,
            valid: false,
            error: 'Internal server error'
        });
    }
};
