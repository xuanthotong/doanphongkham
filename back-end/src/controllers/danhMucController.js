const { sql, connectDB } = require('../config/db');

const getAllCategories = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT id, ten_danh_muc FROM DanhMucTinTuc ORDER BY id ASC');
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách danh mục:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { ten_danh_muc } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('ten_danh_muc', sql.NVarChar, ten_danh_muc)
            .query('INSERT INTO DanhMucTinTuc (ten_danh_muc) VALUES (@ten_danh_muc)');
        res.status(201).json({ message: 'Thêm danh mục thành công!' });
    } catch (error) {
        console.error('Lỗi thêm danh mục:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_danh_muc } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('ten_danh_muc', sql.NVarChar, ten_danh_muc)
            .query('UPDATE DanhMucTinTuc SET ten_danh_muc = @ten_danh_muc WHERE id = @id');
        res.json({ message: 'Cập nhật danh mục thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật danh mục:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM DanhMucTinTuc WHERE id = @id');
        res.json({ message: 'Xóa danh mục thành công!' });
    } catch (error) {
        console.error('Lỗi xóa danh mục:', error);
        if (error.number === 547) return res.status(400).json({ message: 'Không thể xóa vì đang có Bài viết thuộc danh mục này!' });
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory };