const { sql, connectDB } = require('../config/db');

const getAllAccounts = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT tk.id, tk.ten_dang_nhap, tk.email, tk.trang_thai,
                   nd.ho_ten, nd.so_dien_thoai, nd.gioi_tinh, nd.ngay_sinh, nd.anh_dai_dien, nd.dia_chi,
                   vt.ten_vai_tro
            FROM TaiKhoan tk
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN VaiTro vt ON tk.vai_tro_id = vt.id
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách tài khoản:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllAccounts };