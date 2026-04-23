const { sql, connectDB } = require('../config/db');

// Lấy danh sách câu hỏi (ĐÃ THÊM LOGIC LẤY TÊN VÀ VAI TRÒ NGƯỜI TRẢ LỜI)
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
                hd.chuyen_khoa_id,
                ck.ten_chuyen_khoa,
                nd.ho_ten as nguoi_hoi,
                -- Lấy thêm thông tin người trả lời
                vt.ten_vai_tro as vai_tro_tra_loi,
                nd_tl.ho_ten as ten_nguoi_tra_loi
            FROM HoiDap hd
            LEFT JOIN HoSoNguoiDung nd ON hd.benh_nhan_id = nd.tai_khoan_id
            LEFT JOIN ChuyenKhoa ck ON hd.chuyen_khoa_id = ck.id
            -- JOIN 3 bảng này để tìm ra tên và quyền của người đã trả lời (dựa vào cột bac_si_id)
            LEFT JOIN TaiKhoan tk_tl ON hd.bac_si_id = tk_tl.id
            LEFT JOIN VaiTro vt ON tk_tl.vai_tro_id = vt.id
            LEFT JOIN HoSoNguoiDung nd_tl ON hd.bac_si_id = nd_tl.tai_khoan_id
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
        const { tieu_de, noi_dung, benh_nhan_id, chuyen_khoa_id } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('tieu_de', sql.NVarChar, tieu_de)
            .input('noi_dung', sql.NVarChar, noi_dung)
            .input('benh_nhan_id', sql.Int, benh_nhan_id || null)
            .input('chuyen_khoa_id', sql.Int, chuyen_khoa_id || null)
            .query(`INSERT INTO HoiDap (tieu_de_cau_hoi, noi_dung_cau_hoi, benh_nhan_id, chuyen_khoa_id, da_giai_quyet, ngay_tao) VALUES (@tieu_de, @noi_dung, @benh_nhan_id, @chuyen_khoa_id, 0, GETDATE())`);
        res.status(201).json({ message: 'Gửi câu hỏi thành công!' });
    } catch (error) { 
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};

// Lưu câu trả lời (ĐÃ THÊM LOGIC LƯU ID NGƯỜI TRẢ LỜI)
const replyQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        // Nhận thêm ID người trả lời từ Frontend gửi lên
        const { tra_loi, nguoi_tra_loi_id } = req.body; 
        
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('tra_loi', sql.NVarChar, tra_loi)
            .input('bac_si_id', sql.Int, nguoi_tra_loi_id || null) // Cột bac_si_id trong CSDL dùng để lưu người trả lời
            .query(`UPDATE HoiDap SET noi_dung_tra_loi = @tra_loi, bac_si_id = @bac_si_id, da_giai_quyet = 1 WHERE id = @id`);
            
        res.json({ message: 'Trả lời thành công!' });
    } catch (error) { 
        console.error('Lỗi khi trả lời:', error);
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request().input('id', sql.Int, id).query(`DELETE FROM HoiDap WHERE id = @id`);
        res.json({ message: 'Xóa thành công!' });
    } catch (error) { 
        res.status(500).json({ message: 'Lỗi server' }); 
    }
};

module.exports = { getAllQuestions, createQuestion, replyQuestion, deleteQuestion };