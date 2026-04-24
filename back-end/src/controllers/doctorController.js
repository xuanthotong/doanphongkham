const { sql, connectDB } = require('../config/db');
const bcrypt = require('bcrypt');

// Lấy danh sách toàn bộ Bác sĩ (Đã thêm tính năng lấy Đánh giá)
const getAllDoctors = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT tk.id, tk.ten_dang_nhap, tk.email, tk.trang_thai,
                   nd.ho_ten, nd.so_dien_thoai, nd.gioi_tinh, nd.ngay_sinh, nd.anh_dai_dien, nd.dia_chi,
                   bs.nam_kinh_nghiem, bs.phi_kham, bs.tieu_su, bs.chuyen_khoa_id,
                   ck.ten_chuyen_khoa,
                   -- Tính điểm sao trung bình (Làm tròn 1 chữ số thập phân, nếu NULL thì cho là 0)
                   COALESCE(CAST(AVG(CAST(dg.so_sao AS FLOAT)) AS DECIMAL(2,1)), 0) AS diem_danh_gia,
                   -- Đếm tổng số lượt đánh giá
                   COUNT(dg.id) AS luot_danh_gia
            FROM TaiKhoan tk
            JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN HoSoBacSi bs ON tk.id = bs.tai_khoan_id
            JOIN VaiTro vt ON tk.vai_tro_id = vt.id
            LEFT JOIN ChuyenKhoa ck ON bs.chuyen_khoa_id = ck.id
            -- Nối bảng DanhGia vào để tính điểm
            LEFT JOIN DanhGia dg ON bs.tai_khoan_id = dg.bac_si_id
            WHERE vt.ten_vai_tro = 'BacSi'
            -- Bắt buộc phải có GROUP BY khi dùng hàm AVG và COUNT
            GROUP BY tk.id, tk.ten_dang_nhap, tk.email, tk.trang_thai,
                     nd.ho_ten, nd.so_dien_thoai, nd.gioi_tinh, nd.ngay_sinh, nd.anh_dai_dien, nd.dia_chi,
                     bs.nam_kinh_nghiem, bs.phi_kham, bs.tieu_su, bs.chuyen_khoa_id,
                     ck.ten_chuyen_khoa
            ORDER BY tk.id ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Thêm mới Bác sĩ
const createDoctor = async (req, res) => {
    try {
        const { ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, dia_chi, anh_dai_dien, nam_kinh_nghiem, phi_kham, tieu_su, chuyen_khoa_id } = req.body;
        const pool = await connectDB();

        // Kiểm tra xem Username hoặc Email đã tồn tại chưa
        const checkExist = await pool.request()
            .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
            .input('email', sql.VarChar, email)
            .query('SELECT id FROM TaiKhoan WHERE ten_dang_nhap = @ten_dang_nhap OR email = @email');
        if (checkExist.recordset.length > 0) return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại trong hệ thống!' });

        // Mã hóa mật khẩu Bác sĩ
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mat_khau, salt);

        // Lấy ID của Vai trò Bác sĩ
        const roleResult = await pool.request().query("SELECT id FROM VaiTro WHERE ten_vai_tro = 'BacSi'");
        const vai_tro_id = roleResult.recordset[0].id;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Thêm vào TaiKhoan
            const insertAccount = await transaction.request()
                .input('vai_tro_id', sql.Int, vai_tro_id)
                .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
                .input('mat_khau', sql.VarChar, hashedPassword)
                .input('email', sql.VarChar, email)
                .query(`INSERT INTO TaiKhoan (vai_tro_id, ten_dang_nhap, mat_khau, email) OUTPUT INSERTED.id VALUES (@vai_tro_id, @ten_dang_nhap, @mat_khau, @email)`);
            const accountId = insertAccount.recordset[0].id;

            // 2. Thêm vào HoSoNguoiDung
            await transaction.request()
                .input('tai_khoan_id', sql.Int, accountId)
                .input('ho_ten', sql.NVarChar, ho_ten)
                .input('so_dien_thoai', sql.VarChar, so_dien_thoai)
                .input('gioi_tinh', sql.TinyInt, gioi_tinh)
                .input('ngay_sinh', sql.Date, ngay_sinh || null)
                .input('anh_dai_dien', sql.VarChar(sql.MAX), anh_dai_dien)
                .input('dia_chi', sql.NVarChar, dia_chi)
                .query(`INSERT INTO HoSoNguoiDung (tai_khoan_id, ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, anh_dai_dien, dia_chi) VALUES (@tai_khoan_id, @ho_ten, @so_dien_thoai, @gioi_tinh, @ngay_sinh, @anh_dai_dien, @dia_chi)`);

            // 3. Thêm vào HoSoBacSi
            await transaction.request()
                .input('tai_khoan_id', sql.Int, accountId)
                .input('nam_kinh_nghiem', sql.Int, nam_kinh_nghiem)
                .input('phi_kham', sql.Decimal(18,2), phi_kham)
                .input('tieu_su', sql.NVarChar, tieu_su)
                .input('chuyen_khoa_id', sql.Int, chuyen_khoa_id || null)
                .query(`INSERT INTO HoSoBacSi (tai_khoan_id, nam_kinh_nghiem, phi_kham, tieu_su, chuyen_khoa_id) VALUES (@tai_khoan_id, @nam_kinh_nghiem, @phi_kham, @tieu_su, @chuyen_khoa_id)`);

            await transaction.commit();
            res.status(201).json({ message: 'Thêm Bác sĩ thành công!' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) { 
        console.error('Lỗi khi thêm bác sĩ:', error);
        if (error.number === 547) return res.status(400).json({ message: 'Lỗi: Danh mục Chuyên khoa trong Database đang trống, vui lòng thêm Chuyên khoa vào SQL Server trước!' });
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};

// Cập nhật thông tin Bác sĩ
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai, gioi_tinh, ngay_sinh, dia_chi, anh_dai_dien, nam_kinh_nghiem, phi_kham, tieu_su, chuyen_khoa_id } = req.body;
        const pool = await connectDB();

        // Kiểm tra email hoặc ten_dang_nhap trùng với người khác khi sửa
        const checkExist = await pool.request()
            .input('email', sql.VarChar, email)
            .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap)
            .input('id', sql.Int, id)
            .query('SELECT id FROM TaiKhoan WHERE (email = @email OR ten_dang_nhap = @ten_dang_nhap) AND id != @id');
        if (checkExist.recordset.length > 0) return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại ở tài khoản khác!' });

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Cập nhật TaiKhoan (Chỉ cập nhật mật khẩu nếu có gửi mật khẩu mới)
            let updateTkQuery = `UPDATE TaiKhoan SET email = @email, ten_dang_nhap = @ten_dang_nhap WHERE id = @id`;
            const tkReq = transaction.request()
                .input('id', sql.Int, id)
                .input('email', sql.VarChar, email)
                .input('ten_dang_nhap', sql.VarChar, ten_dang_nhap);
            
            if (mat_khau && mat_khau.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(mat_khau, salt);
                updateTkQuery = `UPDATE TaiKhoan SET email = @email, ten_dang_nhap = @ten_dang_nhap, mat_khau = @mat_khau WHERE id = @id`;
                tkReq.input('mat_khau', sql.VarChar, hashedPassword);
            }
            await tkReq.query(updateTkQuery);

            // Cập nhật HoSoNguoiDung
            await transaction.request()
                .input('tai_khoan_id', sql.Int, id)
                .input('ho_ten', sql.NVarChar, ho_ten)
                .input('so_dien_thoai', sql.VarChar, so_dien_thoai)
                .input('gioi_tinh', sql.TinyInt, gioi_tinh)
                .input('ngay_sinh', sql.Date, ngay_sinh || null)
                .input('anh_dai_dien', sql.VarChar(sql.MAX), anh_dai_dien)
                .input('dia_chi', sql.NVarChar, dia_chi)
                .query(`UPDATE HoSoNguoiDung SET ho_ten = @ho_ten, so_dien_thoai = @so_dien_thoai, gioi_tinh = @gioi_tinh, ngay_sinh = @ngay_sinh, anh_dai_dien = @anh_dai_dien, dia_chi = @dia_chi WHERE tai_khoan_id = @tai_khoan_id`);

            // Cập nhật HoSoBacSi
            await transaction.request()
                .input('tai_khoan_id', sql.Int, id)
                .input('nam_kinh_nghiem', sql.Int, nam_kinh_nghiem)
                .input('phi_kham', sql.Decimal(18,2), phi_kham)
                .input('tieu_su', sql.NVarChar, tieu_su)
                .input('chuyen_khoa_id', sql.Int, chuyen_khoa_id || null)
                .query(`UPDATE HoSoBacSi SET nam_kinh_nghiem = @nam_kinh_nghiem, phi_kham = @phi_kham, tieu_su = @tieu_su, chuyen_khoa_id = @chuyen_khoa_id WHERE tai_khoan_id = @tai_khoan_id`);

            await transaction.commit();
            res.json({ message: 'Cập nhật thông tin Bác sĩ thành công!' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Lỗi cập nhật bác sĩ:', error);
        if (error.number === 547) return res.status(400).json({ message: 'Lỗi: Danh mục Chuyên khoa trong Database đang trống, vui lòng thêm Chuyên khoa vào SQL Server trước!' });
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Xóa Bác sĩ
const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        
        // Phải xóa dữ liệu ở bảng phụ trước khi xóa tài khoản ở bảng chính
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM HoSoBacSi WHERE tai_khoan_id = @id`);
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM HoSoNguoiDung WHERE tai_khoan_id = @id`);
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM TaiKhoan WHERE id = @id`);
        
        res.json({ message: 'Xóa Bác sĩ thành công!' });
    } catch (error) {
        console.error('Lỗi khi xóa bác sĩ:', error);
        if (error.number === 547) return res.status(400).json({ message: 'Không thể xóa do bác sĩ này đã có lịch khám hoặc dữ liệu liên quan!' });
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lấy danh sách đánh giá của Bác sĩ
const getDoctorReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('bac_si_id', sql.Int, id)
            .query(`
                SELECT dg.so_sao, dg.noi_dung, dg.ngay_danh_gia,
                       ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan
                FROM DanhGia dg
                JOIN TaiKhoan tk ON dg.benh_nhan_id = tk.id
                LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
                WHERE dg.bac_si_id = @bac_si_id
                ORDER BY dg.ngay_danh_gia DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách đánh giá:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllDoctors, createDoctor, updateDoctor, deleteDoctor, getDoctorReviews };