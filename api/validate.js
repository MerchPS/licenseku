const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Ambil parameter dari query string (?key=xxx&hwid=xxx)
        const { key, hwid } = req.query;
        
        console.log(`[${new Date().toISOString()}] Request: key=${key}, hwid=${hwid}`);

        // Validasi input
        if (!key) {
            return res.status(400).json({ 
                valid: false, 
                error: 'No key provided' 
            });
        }

        // Baca database license
        const dbPath = path.join(process.cwd(), 'data', 'licenses.json');
        
        let database;
        try {
            const rawData = fs.readFileSync(dbPath, 'utf8');
            database = JSON.parse(rawData);
        } catch (e) {
            console.error('Gagal baca database:', e.message);
            return res.status(500).json({ 
                valid: false, 
                error: 'Database error' 
            });
        }

        // Cek maintenance mode
        if (database.settings?.maintenance) {
            return res.status(503).json({
                valid: false,
                error: 'Server dalam maintenance',
                message: database.settings.message || 'Coba lagi nanti'
            });
        }

        // Cek blocklist
        if (database.blocked?.includes(key)) {
            console.log(`⛔ Blocked key: ${key}`);
            return res.status(200).json({
                valid: false,
                error: 'License telah diblokir',
                reason: 'blocked'
            });
        }

        // Cari license
        const license = database.valid?.find(l => l.key === key);

        if (!license) {
            console.log(`❌ Key tidak ditemukan: ${key}`);
            return res.status(200).json({
                valid: false,
                error: 'License tidak valid',
                reason: 'not_found'
            });
        }

        // Cek status aktif
        if (!license.active) {
            console.log(`🔒 License nonaktif: ${key}`);
            return res.status(200).json({
                valid: false,
                error: 'License dinonaktifkan',
                reason: 'inactive'
            });
        }

        // Cek expired
        if (license.expiry) {
            const now = new Date();
            const expiryDate = new Date(license.expiry);
            
            if (now > expiryDate) {
                console.log(`⏰ Expired: ${key}`);
                return res.status(200).json({
                    valid: false,
                    error: 'License telah expired',
                    reason: 'expired',
                    expiredAt: license.expiry
                });
            }
        }

        // Cek HWID (jika di-set)
        if (license.hwid && hwid) {
            if (license.hwid !== hwid) {
                console.log(`🖥️ HWID mismatch: ${key}`);
                return res.status(200).json({
                    valid: false,
                    error: 'License terikat ke perangkat lain',
                    reason: 'hwid_mismatch'
                });
            }
        }

        // Auto-bind HWID (first time)
        if (hwid && !license.hwid) {
            license.hwid = hwid;
            try {
                fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
                console.log(`🔗 HWID bound: ${key} → ${hwid}`);
            } catch (e) {
                console.error('Gagal simpan HWID:', e.message);
            }
        }

        // ============================================
        // ✅ LICENSE VALID → RETURN 403
        // ============================================
        console.log(`✅ Valid: ${key} | Owner: ${license.owner}`);
        
        return res.status(403).json({
            valid: true,
            owner: license.owner,
            expiry: license.expiry,
            hwid_bound: license.hwid ? true : false,
            version: database.settings?.version || '1.0.0',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Server error:', error.message);
        return res.status(500).json({
            valid: false,
            error: 'Internal server error'
        });
    }
};
