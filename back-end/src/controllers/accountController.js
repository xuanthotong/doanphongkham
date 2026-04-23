const { sql, connectDB } = require('../config/db');
const bcrypt = require('bcrypt');

const getAllAccounts = async (req, res) => {
    try {
        const pool = await connectDB();
        // Thêm điều kiện WHERE vt.ten_vai_tro IN ('Admin', 'BenhNhan')
        const result = await pool.request().query(`
            SELECT tk.id, tk.ten_dang_nhap, tk.email, tk.trang_thai,
                   nd.ho_ten, nd.so_dien_thoai, nd.gioi_tinh, nd.ngay_sinh, nd.anh_dai_dien, nd.dia_chi,
                   vt.ten_vai_tro
            FROM TaiKhoan tk
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN VaiTro vt ON tk.vai_tro_id = vt.id
            WHERE vt.ten_vai_tro IN ('Admin', 'BenhNhan')
            ORDER BY tk.id ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách tài khoản:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// ==========================================
// 2. XÓA TÀI KHOẢN
// ==========================================
const deleteAccount = async (req, res) => {
    try {
        const pool = await connectDB();
        const id = req.params.id;

        // BƯỚC 1: Xóa ở bảng HoSoBenhNhan (Theo lỗi bạn vừa gửi)
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM HoSoBenhNhan WHERE tai_khoan_id = @id');

        // BƯỚC 2: Xóa ở bảng HoSoNguoiDung
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM HoSoNguoiDung WHERE tai_khoan_id = @id');

        // BƯỚC 3: Nếu bạn có bảng Lịch Hẹn, Bài Viết... liên quan đến ID này thì cũng phải xóa ở đây
        // await pool.request().input('id', sql.Int, id).query('DELETE FROM LichHen WHERE tai_khoan_id = @id');

        // BƯỚC 4: Cuối cùng mới xóa ở bảng cha TaiKhoan
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM TaiKhoan WHERE id = @id');

        if (result.rowsAffected[0] > 0) {
            res.status(200).json({ message: 'Xóa tài khoản và các hồ sơ liên quan thành công!' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy tài khoản để xóa!' });
        }
    } catch (error) {
        console.error('Lỗi xóa tài khoản:', error);
        // Nếu vẫn báo lỗi FK khác, bạn nhìn tên bảng trong lỗi rồi thêm 1 bước DELETE bảng đó lên trên là được
        res.status(500).json({ message: 'Lỗi server: Vi phạm ràng buộc dữ liệu' });
    }
};

// ==========================================
// 3. SỬA TÀI KHOẢN
// ==========================================
const updateAccount = async (req, res) => {
    try {
        const pool = await connectDB();
        const id = req.params.id;
        const { ho_ten, email, so_dien_thoai, ngay_sinh, gioi_tinh, dia_chi, ten_vai_tro, trang_thai, mat_khau } = req.body;

        // BƯỚC 1: Tìm vai_tro_id từ tên vai trò gửi lên (BacSi, BenhNhan)
        const roleResult = await pool.request()
            .input('ten_vai_tro', sql.VarChar, ten_vai_tro)
            .query('SELECT id FROM VaiTro WHERE ten_vai_tro = @ten_vai_tro');
            
        let vai_tro_id = null;
        if (roleResult.recordset.length > 0) {
            vai_tro_id = roleResult.recordset[0].id;
        }

        // BƯỚC 2: Cập nhật bảng TaiKhoan (chứa email, trang thái, vai trò, mật khẩu)
        let updateTaiKhoanQuery = `UPDATE TaiKhoan SET email = @email, trang_thai = @trang_thai`;
        const reqTaiKhoan = pool.request()
            .input('id', sql.Int, id)
            .input('email', sql.VarChar, email)
            .input('trang_thai', sql.Bit, trang_thai);

        if (vai_tro_id) {
            updateTaiKhoanQuery += `, vai_tro_id = @vai_tro_id`;
            reqTaiKhoan.input('vai_tro_id', sql.Int, vai_tro_id);
        }
        if (mat_khau) { // Nếu admin gõ mật khẩu mới thì mới update
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(mat_khau, salt);
            updateTaiKhoanQuery += `, mat_khau = @mat_khau`;
            reqTaiKhoan.input('mat_khau', sql.VarChar, hashedPassword);
        }
        updateTaiKhoanQuery += ` WHERE id = @id`;
        await reqTaiKhoan.query(updateTaiKhoanQuery);

        // BƯỚC 3: Cập nhật bảng HoSoNguoiDung (chứa thông tin cá nhân)
        // Kiểm tra xem user này đã có hồ sơ chưa, nếu có thì UPDATE, chưa có thì tự xử lý (ở đây mặc định là có)
        const reqHoSo = pool.request()
            .input('id', sql.Int, id)
            .input('ho_ten', sql.NVarChar, ho_ten)
            .input('so_dien_thoai', sql.VarChar, so_dien_thoai)
            .input('ngay_sinh', sql.Date, ngay_sinh || null)
            .input('gioi_tinh', sql.Bit, gioi_tinh !== "" ? gioi_tinh : null)
            .input('dia_chi', sql.NVarChar, dia_chi);

        await reqHoSo.query(`
            UPDATE HoSoNguoiDung
            SET ho_ten = @ho_ten, so_dien_thoai = @so_dien_thoai,
                ngay_sinh = @ngay_sinh, gioi_tinh = @gioi_tinh, dia_chi = @dia_chi
            WHERE tai_khoan_id = @id
        `);

        res.status(200).json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Lỗi sửa tài khoản:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// ==========================================
// 4. CẬP NHẬT HỒ SƠ CÁ NHÂN (BỆNH NHÂN)
// ==========================================
const updateProfile = async (req, res) => {
    try {
        const pool = await connectDB();
        const id = req.params.id;
        const { dia_chi, gioi_tinh } = req.body;

        // Xử lý chuyển đổi giới tính (1: Nam, 0: Nữ)
        let gioi_tinh_bit = null;
        if (gioi_tinh === "1" || gioi_tinh === 1) gioi_tinh_bit = 1;
        else if (gioi_tinh === "0" || gioi_tinh === 0) gioi_tinh_bit = 0;

        await pool.request()
            .input('id', sql.Int, id)
            .input('dia_chi', sql.NVarChar, dia_chi || null)
            .input('gioi_tinh', sql.Bit, gioi_tinh_bit)
            .query(`
                UPDATE HoSoNguoiDung
                SET dia_chi = @dia_chi, 
                    gioi_tinh = @gioi_tinh
                WHERE tai_khoan_id = @id
            `);

        res.status(200).json({ message: 'Cập nhật hồ sơ cá nhân thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật hồ sơ cá nhân:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllAccounts, deleteAccount, updateAccount, updateProfile };