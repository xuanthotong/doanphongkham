const { sql, connectDB } = require('../config/db');

const getAllSpecialties = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query('SELECT id, ten_chuyen_khoa, mo_ta FROM ChuyenKhoa ORDER BY id ASC');
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const createSpecialty = async (req, res) => {
    try {
        const { ten_chuyen_khoa, mo_ta } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('ten_chuyen_khoa', sql.NVarChar, ten_chuyen_khoa)
            .input('mo_ta', sql.NVarChar, mo_ta || '')
            .query('INSERT INTO ChuyenKhoa (ten_chuyen_khoa, mo_ta) VALUES (@ten_chuyen_khoa, @mo_ta)');
        res.status(201).json({ message: 'Thêm chuyên khoa thành công!' });
    } catch (error) {
        console.error('Lỗi thêm chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const updateSpecialty = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_chuyen_khoa, mo_ta } = req.body;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('ten_chuyen_khoa', sql.NVarChar, ten_chuyen_khoa)
            .input('mo_ta', sql.NVarChar, mo_ta || '')
            .query('UPDATE ChuyenKhoa SET ten_chuyen_khoa = @ten_chuyen_khoa, mo_ta = @mo_ta WHERE id = @id');
        res.json({ message: 'Cập nhật chuyên khoa thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật chuyên khoa:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const deleteSpecialty = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM ChuyenKhoa WHERE id = @id');
        res.json({ message: 'Xóa chuyên khoa thành công!' });
    } catch (error) {
        console.error('Lỗi xóa chuyên khoa:', error);
        // Lỗi 547 là lỗi vi phạm khóa ngoại (Foreign Key)
        if (error.number === 547) {
            return res.status(400).json({ message: 'Không thể xóa vì đang có Bác sĩ thuộc chuyên khoa này!' });
        }
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = {
    getAllSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty
};