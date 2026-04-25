const { sql, connectDB } = require('../config/db');

// 1. ADMIN: Lấy tất cả đánh giá để quản lý
const getAllReviewsAdmin = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT dg.id, dg.so_sao, dg.noi_dung, dg.ngay_danh_gia, dg.phan_hoi_cua_bac_si, dg.trang_thai_an,
                   lk.id as lich_kham_id,
                   ISNULL(bn_nd.ho_ten, bn_tk.ten_dang_nhap) as ten_benh_nhan,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
            FROM DanhGia dg
            JOIN LichKham lk ON dg.lich_kham_id = lk.id
            JOIN TaiKhoan bn_tk ON dg.benh_nhan_id = bn_tk.id
            LEFT JOIN HoSoNguoiDung bn_nd ON bn_tk.id = bn_nd.tai_khoan_id
            JOIN TaiKhoan bs_tk ON dg.bac_si_id = bs_tk.id
            LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
            ORDER BY dg.ngay_danh_gia DESC
        `);
        res.json(result.recordset);
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 2. ADMIN: Ẩn / Hiện đánh giá
const toggleHideReview = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        // Lấy trạng thái hiện tại và đảo ngược lại (1 thành 0, 0 thành 1)
        await pool.request().input('id', sql.Int, id).query(`
            UPDATE DanhGia 
            SET trang_thai_an = CASE WHEN ISNULL(trang_thai_an, 0) = 0 THEN 1 ELSE 0 END 
            WHERE id = @id
        `);
        res.json({ message: 'Thay đổi trạng thái hiển thị thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 3. ADMIN / BỆNH NHÂN: Xóa hẳn đánh giá
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM DanhGia WHERE id = @id');
        res.json({ message: 'Đã xóa đánh giá khỏi hệ thống!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 4. BÁC SĨ: Phản hồi đánh giá
const replyReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { phan_hoi } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('phan_hoi', sql.NVarChar, phan_hoi)
            .query('UPDATE DanhGia SET phan_hoi_cua_bac_si = @phan_hoi WHERE id = @id');
        res.json({ message: 'Đã gửi phản hồi cho bệnh nhân!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

// 5. BỆNH NHÂN: Chỉnh sửa lại đánh giá của mình
const editReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { so_sao, noi_dung } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('so_sao', sql.Int, so_sao)
            .input('noi_dung', sql.NVarChar, noi_dung)
            .query('UPDATE DanhGia SET so_sao = @so_sao, noi_dung = @noi_dung, ngay_danh_gia = GETDATE() WHERE id = @id');
        res.json({ message: 'Cập nhật đánh giá thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

module.exports = { getAllReviewsAdmin, toggleHideReview, deleteReview, replyReview, editReview };
