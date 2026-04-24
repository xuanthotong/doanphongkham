const { sql, connectDB } = require('../config/db');

// Lấy TẤT CẢ lịch hẹn cho Admin
const getAllAppointments = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao,
                   llv.ngay_lam_viec, llv.khung_gio,
                   nd.ho_ten as ten_benh_nhan, nd.so_dien_thoai,
                   bs_nd.ho_ten as ten_bac_si
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            JOIN HoSoNguoiDung nd ON lk.benh_nhan_id = nd.tai_khoan_id
            JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
            LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
            ORDER BY lk.ngay_tao DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy tất cả lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lấy danh sách lịch hẹn của 1 bác sĩ
const getAppointmentsByDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('bac_si_id', sql.Int, id)
            .query(`
                SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao,
                       llv.ngay_lam_viec, llv.khung_gio,
                       nd.ho_ten as ten_benh_nhan, nd.so_dien_thoai
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN HoSoNguoiDung nd ON lk.benh_nhan_id = nd.tai_khoan_id
                WHERE llv.bac_si_id = @bac_si_id
                ORDER BY llv.ngay_lam_viec DESC, llv.khung_gio ASC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Cập nhật trạng thái lịch hẹn (Duyệt, Hủy, Hoàn thành)
const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai, ghi_chu_cua_bac_si } = req.body;
        const pool = await connectDB();
        
        let query = `UPDATE LichKham SET trang_thai = @trang_thai`;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('trang_thai', sql.VarChar, trang_thai);
            
        if (ghi_chu_cua_bac_si) {
            query += `, ghi_chu_cua_bac_si = @ghi_chu_cua_bac_si`;
            request.input('ghi_chu_cua_bac_si', sql.NVarChar, ghi_chu_cua_bac_si);
        }
        
        query += ` WHERE id = @id`;
        await request.query(query);
        
        res.json({ message: 'Cập nhật trạng thái thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 4. Đặt lịch khám mới (Bệnh nhân đặt lịch)
const createAppointment = async (req, res) => {
    try {
        const { lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung } = req.body;
        const pool = await connectDB();
        
        // Thêm lịch khám mới với trạng thái mặc định là 'Pending'
        await pool.request()
            .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
            .input('benh_nhan_id', sql.Int, benh_nhan_id)
            .input('mo_ta_trieu_chung', sql.NVarChar, mo_ta_trieu_chung)
            .query(`
                INSERT INTO LichKham (lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung, trang_thai, ngay_tao)
                VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, 'Pending', GETDATE())
            `);
            
        // Tăng số lượng đã đặt trong ca làm việc lên 1
        await pool.request()
            .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
            .query(`
                UPDATE LichLamViec 
                SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 
                WHERE id = @lich_lam_viec_id
            `);

        res.status(201).json({ message: 'Đặt lịch khám thành công!' });
    } catch (error) {
        console.error('Lỗi đặt lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Xóa lịch hẹn
const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        
        // Trừ đi số lượng đặt trong bảng LichLamViec nếu lịch chưa khám xong
        const appInfo = await pool.request().input('id', sql.Int, id).query('SELECT lich_lam_viec_id, trang_thai FROM LichKham WHERE id = @id');
        if (appInfo.recordset.length > 0) {
            const { lich_lam_viec_id, trang_thai } = appInfo.recordset[0];
            if (trang_thai !== 'Done' && trang_thai !== 'Cancelled') {
                await pool.request().input('lich_lam_viec_id', sql.Int, lich_lam_viec_id).query('UPDATE LichLamViec SET so_luong_hien_tai = so_luong_hien_tai - 1 WHERE id = @lich_lam_viec_id AND so_luong_hien_tai > 0');
            }
        }
        
        await pool.request().input('id', sql.Int, id).query('DELETE FROM LichKham WHERE id = @id');
        res.json({ message: 'Xóa lịch hẹn thành công!' });
    } catch (error) {
        console.error('Lỗi xóa lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllAppointments, getAppointmentsByDoctor, updateAppointmentStatus, deleteAppointment, createAppointment };