module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');

    const key = req.query.key;
    
    // Valid keys list
    const validKeys = {
        'HXS-2024-A1B2C3D4': { owner: 'Customer 1', expiry: '2025-12-31' },
        'HXS-2024-X9Y8Z7W6': { owner: 'Customer 2', expiry: '2026-06-30' }
    };

    // Blocked keys
    const blockedKeys = ['HXS-OLD-LEAKED-KEY1', 'HXS-OLD-LEAKED-KEY2'];

    if (!key) {
        return res.json({ valid: false, error: 'No key' });
    }

    if (blockedKeys.includes(key)) {
        return res.json({ valid: false, reason: 'blocked' });
    }

    const license = validKeys[key];

    if (!license) {
        return res.json({ valid: false, reason: 'not_found' });
    }

    // VALID -> 403
    return res.status(403).json({
        valid: true,
        owner: license.owner,
        expiry: license.expiry,
        timestamp: new Date().toISOString()
    });
};
