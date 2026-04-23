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

// 2. API ĐĂNG NHẬP (LẤY DỮ LIỆU THẬT ĐỒNG BỘ)
const login = async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau } = req.body;
        const pool = await connectDB();
        
        // Dùng LEFT JOIN để lấy tất cả dữ liệu từ các bảng Hồ Sơ
        const result = await pool.request()
            .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
            .query(`
                SELECT 
                    tk.id, tk.ten_dang_nhap, tk.email, tk.mat_khau, tk.trang_thai, tk.vai_tro_id,
                    vt.ten_vai_tro,
                    hsnd.ho_ten, hsnd.so_dien_thoai, hsnd.anh_dai_dien, hsnd.gioi_tinh, hsnd.dia_chi,
                    hsbs.nam_kinh_nghiem, hsbs.phi_kham, hsbs.tieu_su, hsbs.chuyen_khoa_id,
                    ck.ten_chuyen_khoa
                FROM TaiKhoan tk
                JOIN VaiTro vt ON tk.vai_tro_id = vt.id
                LEFT JOIN HoSoNguoiDung hsnd ON tk.id = hsnd.tai_khoan_id
                LEFT JOIN HoSoBacSi hsbs ON tk.id = hsbs.tai_khoan_id
                LEFT JOIN ChuyenKhoa ck ON hsbs.chuyen_khoa_id = ck.id
                WHERE tk.ten_dang_nhap = @ten_dang_nhap
            `);

        const user = result.recordset[0];
        if (!user) return res.status(400).json({ message: 'Tên đăng nhập không tồn tại!' });
        if (!user.trang_thai) return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa!' });

        const isMatch = await bcrypt.compare(mat_khau, user.mat_khau);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        const token = jwt.sign(
            { id: user.id, vai_tro_id: user.vai_tro_id, ten_vai_tro: user.ten_vai_tro },
            process.env.JWT_SECRET || 'ttmedical_secret_key',
            { expiresIn: '1d' }
        );

        let redirectUrl = '../pages/patient/patient.html'; 
        if (user.ten_vai_tro === 'Admin') redirectUrl = '../pages/admin/dashboard.html';
        else if (user.ten_vai_tro === 'BacSi') redirectUrl = '../pages/doctor/doctor.html';

        // ĐỒNG BỘ: Trả về cục dữ liệu chứa đầy đủ thông tin để lưu vào localStorage
        res.json({ 
            message: 'Đăng nhập thành công', 
            token, 
            user: { 
                id: user.id, 
                ten_dang_nhap: user.ten_dang_nhap, 
                role: user.ten_vai_tro,
                email: user.email,
                ho_ten: user.ho_ten,
                gioi_tinh: user.gioi_tinh,
                dia_chi: user.dia_chi,
                so_dien_thoai: user.so_dien_thoai,
                anh_dai_dien: user.anh_dai_dien,
                nam_kinh_nghiem: user.nam_kinh_nghiem,
                phi_kham: user.phi_kham,
                tieu_su: user.tieu_su,
                chuyen_khoa_id: user.chuyen_khoa_id,
                ten_chuyen_khoa: user.ten_chuyen_khoa
            }, 
            redirectUrl 
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
};
module.exports = { registerPatient, login };