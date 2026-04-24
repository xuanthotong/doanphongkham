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

        const checkResult = await pool.request().input('id', sql.Int, id).query(`SELECT so_luong_hien_tai FROM LichLamViec WHERE id = @id`);
        if (checkResult.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy ca làm việc' });
        
        if (checkResult.recordset[0].so_luong_hien_tai > 0) {
            return res.status(400).json({ message: 'Không thể xóa ca làm việc đã có bệnh nhân đặt lịch!' });
        }

        await pool.request().input('id', sql.Int, id).query(`DELETE FROM LichLamViec WHERE id = @id`);
        res.json({ message: 'Xóa ca làm việc thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
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


module.exports = { getShiftsByDoctor, createShift, updateShift, deleteShift, stopShift, getAllShifts, resumeShift};