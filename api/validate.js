// Memanggil data JSON (Vercel mendukung require ke file JSON lokal)
const licenses = require('../data/licenses.json'); 

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 1. Cek Mode Maintenance
    if (licenses.settings.maintenance) {
        return res.status(200).json({ valid: false, reason: 'maintenance', message: licenses.settings.message });
    }

    const key = req.query.key;

    if (!key) {
        return res.status(200).json({ valid: false, error: 'No key provided' });
    }

    // 2. Cek apakah kena Block/Banned
    if (licenses.blocked.includes(key)) {
        return res.status(200).json({ valid: false, reason: 'blocked' });
    }

    // 3. Cari Lisensi di Data Valid
    // Pastikan key cocok dan status active-nya true
    const license = licenses.valid.find(l => l.key === key && l.active === true);

    if (!license) {
        return res.status(200).json({ valid: false, reason: 'not_found_or_inactive' });
    }

    // 4. Cek Tanggal Kadaluarsa (Expired Date)
    const today = new Date();
    const expiryDate = new Date(license.expiry);
    if (today > expiryDate) {
        return res.status(200).json({ valid: false, reason: 'expired' });
    }

    // ==========================================
    // 5. VALID -> KEMBALIKAN STATUS 403 + KEY DEKRIPSI
    // ==========================================
    return res.status(403).json({
        valid: true,
        owner: license.owner,
        expiry: license.expiry,
        decryptionKey: licenses.settings.decryptionKey, // INI YANG AKAN DITANGKAP OLEH BOT
        timestamp: new Date().toISOString()
    });
};
