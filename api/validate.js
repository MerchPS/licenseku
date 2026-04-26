// FILE INI HARUS ADA DI: api/validate.js
// BUKAN di folder lain!

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { key, hwid } = req.query;
    
    // Debug log
    console.log('Request:', { key, hwid });
    
    // ============================================
    // SIMPLE TEST DULU - NANTI TINGGAL GANTI
    // ============================================
    
    if (!key) {
        return res.status(200).json({ 
            valid: false, 
            error: 'No key provided' 
        });
    }
    
    // LIST LICENSE (ganti pake database nanti)
    const validKeys = [
        'HXS-2024-TEST-KEY',
        'HXS-2024-A1B2C3D4',
        'TEST-LICENSE-123'
    ];
    
    if (validKeys.includes(key)) {
        return res.status(403).json({
            valid: true,
            owner: 'Test User',
            expiry: '2025-12-31',
            status: 'active'
        });
    }
    
    return res.status(200).json({
        valid: false,
        reason: 'invalid'
    });
};
