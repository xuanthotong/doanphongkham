const { sql, connectDB } = require('../config/db');
const bcrypt = require('bcrypt'); // Yêu cầu chạy: npm install bcrypt jsonwebtoken
const jwt = require('jsonwebtoken');

// 1. API ĐĂNG KÝ (Chỉ dành cho Bệnh nhân)
const registerPatient = async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai } = req.body;
        const pool = await connectDB();
        
        // Kiểm tra xem Username hoặc Email đã tồn tại chưa
        const checkUser = await pool.request()
            .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM TaiKhoan WHERE ten_dang_nhap = @ten_dang_nhap OR email = @email');
            
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại!' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mat_khau, salt);

        // Lấy ID của Vai trò "BenhNhan"
        const roleResult = await pool.request()
            .input('ten_vai_tro', sql.VarChar, 'BenhNhan')
            .query('SELECT id FROM VaiTro WHERE ten_vai_tro = @ten_vai_tro');
        const vai_tro_id = roleResult.recordset[0].id;

        // Dùng Transaction để Insert vào nhiều bảng cùng lúc, tránh lỗi rác dữ liệu
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Bảng TaiKhoan
            const insertAccount = await transaction.request()
                .input('vai_tro_id', sql.Int, vai_tro_id)
                .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
                .input('mat_khau', sql.VarChar, hashedPassword)
                .input('email', sql.VarChar, email)
                .query(`
                    INSERT INTO TaiKhoan (vai_tro_id, ten_dang_nhap, mat_khau, email) 
                    OUTPUT INSERTED.id
                    VALUES (@vai_tro_id, @ten_dang_nhap, @mat_khau, @email)
                `);
            const accountId = insertAccount.recordset[0].id;

            // Bảng HoSoNguoiDung
            await transaction.request()
                .input('tai_khoan_id', sql.Int, accountId)
                .input('ho_ten', sql.NVarChar, ho_ten)
                .input('so_dien_thoai', sql.VarChar, so_dien_thoai)
                .query(`
                    INSERT INTO HoSoNguoiDung (tai_khoan_id, ho_ten, so_dien_thoai) 
                    VALUES (@tai_khoan_id, @ho_ten, @so_dien_thoai)
                `);

            // Bảng HoSoBenhNhan
            await transaction.request()
                .input('tai_khoan_id', sql.Int, accountId)
                .query('INSERT INTO HoSoBenhNhan (tai_khoan_id) VALUES (@tai_khoan_id)');

            await transaction.commit();
            res.status(201).json({ message: 'Đăng ký tài khoản Bệnh nhân thành công!' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng ký' });
    }
};

// 2. API ĐĂNG NHẬP (Dành cho Admin, Bác sĩ & Bệnh nhân)
const login = async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau } = req.body;
        const pool = await connectDB();
        
        // JOIN 2 bảng để lấy Tên Vai Trò (dùng để điều hướng)
        const result = await pool.request()
            .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
            .query(`
                SELECT tk.*, vt.ten_vai_tro 
                FROM TaiKhoan tk
                JOIN VaiTro vt ON tk.vai_tro_id = vt.id
                WHERE tk.ten_dang_nhap = @ten_dang_nhap
            `);

        const user = result.recordset[0];
        if (!user) return res.status(400).json({ message: 'Tên đăng nhập không tồn tại!' });
        if (!user.trang_thai) return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa!' });

        // So sánh Password
        const isMatch = await bcrypt.compare(mat_khau, user.mat_khau);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        // Tạo JWT Token
        const token = jwt.sign(
            { id: user.id, vai_tro_id: user.vai_tro_id, ten_vai_tro: user.ten_vai_tro },
            process.env.JWT_SECRET || 'ttmedical_secret_key',
            { expiresIn: '1d' }
        );

        // Logic trả về đường dẫn dựa theo Role
        let redirectUrl = '../pages/patient/index.html'; // Mặc định cho Bệnh Nhân (Giao diện Trang chủ)
        if (user.ten_vai_tro === 'Admin') redirectUrl = '../pages/admin/dashboard.html';
        else if (user.ten_vai_tro === 'BacSi') redirectUrl = '../pages/doctor/doctor.html';

        res.json({ message: 'Đăng nhập thành công', token, user: { id: user.id, username: user.ten_dang_nhap, role: user.ten_vai_tro }, redirectUrl });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};
module.exports = { registerPatient, login };