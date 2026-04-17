const { sql, connectDB } = require('../config/db');

const getAllPosts = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT t.id, t.tieu_de, t.noi_dung, t.anh_thu_nho, t.ngay_xuat_ban, t.danh_muc_id,
                   tk.ten_dang_nhap as tac_gia
            FROM TinTuc t
            LEFT JOIN TaiKhoan tk ON t.tac_gia_id = tk.id
            ORDER BY t.ngay_xuat_ban DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const createPost = async (req, res) => {
    try {
        const { tieu_de, noi_dung, danh_muc_id, anh_thu_nho, ngay_xuat_ban, tac_gia_id } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('danh_muc_id', sql.Int, danh_muc_id)
            .input('tac_gia_id', sql.Int, tac_gia_id || 1) // Mặc định tài khoản Admin có ID = 1
            .input('tieu_de', sql.NVarChar, tieu_de)
            .input('noi_dung', sql.NVarChar, noi_dung)
            .input('anh_thu_nho', sql.VarChar(sql.MAX), anh_thu_nho)
            .input('ngay_xuat_ban', sql.DateTime, ngay_xuat_ban)
            .query(`INSERT INTO TinTuc (danh_muc_id, tac_gia_id, tieu_de, noi_dung, anh_thu_nho, ngay_xuat_ban)
                    VALUES (@danh_muc_id, @tac_gia_id, @tieu_de, @noi_dung, @anh_thu_nho, @ngay_xuat_ban)`);
        res.status(201).json({ message: 'Đăng bài thành công!' });
    } catch (error) {
        console.error(error);
        if (error.number === 547) return res.status(400).json({ message: 'Danh mục không tồn tại trong CSDL!' });
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { tieu_de, noi_dung, danh_muc_id, anh_thu_nho, ngay_xuat_ban } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('danh_muc_id', sql.Int, danh_muc_id)
            .input('tieu_de', sql.NVarChar, tieu_de)
            .input('noi_dung', sql.NVarChar, noi_dung)
            .input('anh_thu_nho', sql.VarChar(sql.MAX), anh_thu_nho)
            .input('ngay_xuat_ban', sql.DateTime, ngay_xuat_ban)
            .query(`UPDATE TinTuc SET danh_muc_id = @danh_muc_id, tieu_de = @tieu_de, noi_dung = @noi_dung, anh_thu_nho = @anh_thu_nho, ngay_xuat_ban = @ngay_xuat_ban WHERE id = @id`);
        res.json({ message: 'Cập nhật bài viết thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

const deletePost = async (req, res) => {
    try {
        const pool = await connectDB();
        await pool.request().input('id', sql.Int, req.params.id).query(`DELETE FROM TinTuc WHERE id = @id`);
        res.json({ message: 'Xóa bài viết thành công!' });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};
module.exports = { getAllPosts, createPost, updatePost, deletePost };