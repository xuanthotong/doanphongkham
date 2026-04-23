const { sql, connectDB } = require('../config/db');
const bcrypt = require('bcrypt');

const resetPassword = async (req, res) => {
    try {
        const { email, mat_khau_moi } = req.body;
        const pool = await connectDB();

        // Kiểm tra xem email có tồn tại trong bảng TaiKhoan không
        const checkEmail = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM TaiKhoan WHERE email = @email');

        if (checkEmail.recordset.length === 0) {
            return res.status(404).json({ message: 'Email này không tồn tại trong hệ thống!' });
        }

        // Mã hóa mật khẩu mới trước khi lưu vào CSDL
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mat_khau_moi, salt);

        // Cập nhật mật khẩu mới cho tài khoản có email trùng khớp
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('mat_khau_moi', sql.VarChar, hashedPassword)
            .query('UPDATE TaiKhoan SET mat_khau = @mat_khau_moi WHERE email = @email');

        res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { resetPassword };