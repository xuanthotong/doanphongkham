const { sql, connectDB } = require('../config/db');

const getAllSpecialties = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT id, ten_chuyen_khoa FROM ChuyenKhoa ORDER BY ten_chuyen_khoa');
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = {
    getAllSpecialties
};