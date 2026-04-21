const { sql, connectDB } = require('../config/db');

const getAllQuestions = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT 
                hd.id, 
                hd.tieu_de_cau_hoi as tieu_de, 
                hd.noi_dung_cau_hoi as noi_dung, 
                hd.noi_dung_tra_loi as tra_loi,
                hd.da_giai_quyet as trang_thai,
                hd.ngay_tao,
                nd.ho_ten as nguoi_hoi
            FROM HoiDap hd
            LEFT JOIN HoSoNguoiDung nd ON hd.benh_nhan_id = nd.tai_khoan_id
            ORDER BY hd.ngay_tao DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách câu hỏi:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const createQuestion = async (req, res) => {
    try {
        const { tieu_de, noi_dung, benh_nhan_id } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('tieu_de', sql.NVarChar, tieu_de)
            .input('noi_dung', sql.NVarChar, noi_dung)
            .input('benh_nhan_id', sql.Int, benh_nhan_id || null)
            .query(`INSERT INTO HoiDap (tieu_de_cau_hoi, noi_dung_cau_hoi, benh_nhan_id, da_giai_quyet, ngay_tao) VALUES (@tieu_de, @noi_dung, @benh_nhan_id, 0, GETDATE())`);
        res.status(201).json({ message: 'Gửi câu hỏi thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

const replyQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { tra_loi } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('tra_loi', sql.NVarChar, tra_loi)
            .query(`UPDATE HoiDap SET noi_dung_tra_loi = @tra_loi, da_giai_quyet = 1 WHERE id = @id`);
        res.json({ message: 'Trả lời thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM HoiDap WHERE id = @id`);
        res.json({ message: 'Xóa thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

module.exports = { getAllQuestions, createQuestion, replyQuestion, deleteQuestion };