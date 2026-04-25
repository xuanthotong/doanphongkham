const { sql, connectDB } = require('../config/db');

// Lấy danh sách ca làm việc của 1 bác sĩ
const getShiftsByDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('bac_si_id', sql.Int, id)
            .query(`
                SELECT * FROM LichLamViec 
                WHERE bac_si_id = @bac_si_id 
                ORDER BY ngay_lam_viec DESC, khung_gio ASC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy ca làm việc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Đăng ký ca làm việc mới
const createShift = async (req, res) => {
    try {
        const { bac_si_id, ngay_lam_viec, khung_gio, so_luong_toi_da } = req.body;
        const pool = await connectDB();

        await pool.request()
            .input('bac_si_id', sql.Int, bac_si_id)
            .input('ngay_lam_viec', sql.Date, ngay_lam_viec)
            .input('khung_gio', sql.VarChar, khung_gio)
            .input('so_luong_toi_da', sql.Int, so_luong_toi_da)
            .query(`
                INSERT INTO LichLamViec (bac_si_id, ngay_lam_viec, khung_gio, so_luong_toi_da, so_luong_hien_tai) 
                VALUES (@bac_si_id, @ngay_lam_viec, @khung_gio, @so_luong_toi_da, 0)
            `);
        res.status(201).json({ message: 'Đăng ký ca làm việc thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// Cập nhật ca làm việc
const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { ngay_lam_viec, khung_gio, so_luong_toi_da } = req.body;
        const pool = await connectDB();

        // Kiểm tra xem có người đặt chưa
        const checkResult = await pool.request().input('id', sql.Int, id).query(`SELECT so_luong_hien_tai FROM LichLamViec WHERE id = @id`);
        if (checkResult.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy ca làm việc' });

        const booked = checkResult.recordset[0].so_luong_hien_tai || 0;
        if (so_luong_toi_da < booked) {
            return res.status(400).json({ message: `Số lượng tối đa không thể nhỏ hơn số bệnh nhân đã đặt (${booked})` });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('ngay_lam_viec', sql.Date, ngay_lam_viec)
            .input('khung_gio', sql.VarChar, khung_gio)
            .input('so_luong_toi_da', sql.Int, so_luong_toi_da)
            .query(`
                UPDATE LichLamViec 
                SET ngay_lam_viec = @ngay_lam_viec, khung_gio = @khung_gio, so_luong_toi_da = @so_luong_toi_da
                WHERE id = @id
            `);
            
        res.json({ message: 'Cập nhật ca làm việc thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// Dừng ca làm việc
const stopShift = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE LichLamViec SET trang_thai = 'Stopped' WHERE id = @id");
        res.json({ message: 'Dừng ca làm việc thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// Mở lại ca làm việc
const resumeShift = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE LichLamViec SET trang_thai = 'Active' WHERE id = @id");
        res.json({ message: 'Mở lại ca làm việc thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// Xóa ca làm việc
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();

        // Kiểm tra xem có lịch khám nào đang tồn tại (không phải trạng thái Cancelled) không
        const checkApp = await pool.request().input('id', sql.Int, id).query(`
            SELECT COUNT(*) as count FROM LichKham 
            WHERE lich_lam_viec_id = @id AND trang_thai IN ('Pending', 'Approved', 'Done')
        `);
        
        if (checkApp.recordset[0].count > 0) {
            return res.status(400).json({ message: 'Không thể xóa! Ca làm việc này đang có bệnh nhân đặt lịch hoặc đã khám xong.' });
        }

        // Xóa sạch các đánh giá và lịch khám rác (Cancelled) liên quan trước, sau đó xóa ca làm việc
        await pool.request().input('id', sql.Int, id).query(`
            DELETE FROM DanhGia WHERE lich_kham_id IN (SELECT id FROM LichKham WHERE lich_lam_viec_id = @id);
            DELETE FROM LichKham WHERE lich_lam_viec_id = @id;
            DELETE FROM LichLamViec WHERE id = @id;
        `);
        
        res.json({ message: 'Xóa ca làm việc thành công! Hệ thống đã dọn dẹp các dữ liệu rác liên quan.' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// Thêm hàm lấy TOÀN BỘ ca làm việc cho Admin
const getAllShiftsAdmin = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT llv.*, 
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_bac_si,
                   ck.ten_chuyen_khoa
            FROM LichLamViec llv
            JOIN TaiKhoan tk ON llv.bac_si_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            LEFT JOIN HoSoBacSi hsbs ON tk.id = hsbs.tai_khoan_id
            LEFT JOIN ChuyenKhoa ck ON hsbs.chuyen_khoa_id = ck.id
            ORDER BY llv.ngay_lam_viec DESC, llv.khung_gio ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách ca làm cho Admin:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Thêm hàm này vào shiftController.js
const getAllShifts = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT * FROM LichLamViec 
            WHERE CAST(ngay_lam_viec AS DATE) >= CAST(GETDATE() AS DATE)
            AND ISNULL(trang_thai, 'Active') = 'Active'
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách ca làm việc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lưu ý: Đừng quên export getAllShifts ở cuối file.


module.exports = { getShiftsByDoctor, createShift, updateShift, deleteShift, stopShift, getAllShifts, resumeShift, getAllShiftsAdmin };