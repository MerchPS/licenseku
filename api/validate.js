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
        const { key, hwid } = req.query;
        
        console.log(`[${new Date().toISOString()}] Key: ${key?.substring(0, 10)}... | HWID: ${hwid?.substring(0, 10)}...`);

        if (!key) {
            return res.status(400).json({ valid: false, error: 'No key provided' });
        }

        // Baca database
        const dbPath = path.join(process.cwd(), 'data', 'licenses.json');
        const database = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // Cek maintenance
        if (database.settings?.maintenance) {
            return res.status(200).json({
                valid: false,
                reason: 'maintenance',
                message: database.settings.message || 'Server dalam maintenance'
            });
        }

        // Cek blocked
        if (database.blocked?.includes(key)) {
            console.log(`⛔ Blocked: ${key}`);
            return res.status(200).json({ valid: false, reason: 'blocked' });
        }

        // Cari license
        const license = database.valid?.find(l => l.key === key);

        if (!license) {
            console.log(`❌ Not found: ${key}`);
            return res.status(200).json({ valid: false, reason: 'not_found' });
        }

        if (!license.active) {
            console.log(`🔒 Inactive: ${key}`);
            return res.status(200).json({ valid: false, reason: 'inactive' });
        }

        if (license.expiry) {
            const now = new Date();
            const expiry = new Date(license.expiry);
            if (now > expiry) {
                console.log(`⏰ Expired: ${key}`);
                return res.status(200).json({ 
                    valid: false, 
                    reason: 'expired',
                    expiredAt: license.expiry 
                });
            }
        }

        // HWID check
        if (license.hwid && hwid && license.hwid !== hwid) {
            console.log(`🖥️ HWID mismatch: ${key}`);
            return res.status(200).json({ valid: false, reason: 'hwid_mismatch' });
        }

        // ✅ VALID!
        console.log(`✅ Valid: ${key} | ${license.owner}`);
        
        return res.status(403).json({
            valid: true,
            owner: license.owner,
            expiry: license.expiry,
            hwid_bound: !!license.hwid,
            version: database.settings?.version || '1.0.0',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({ valid: false, error: 'Internal server error' });
    }
};
