const { sql, connectDB } = require('../config/db');

// Lấy tất cả thuốc (Admin + Bác sĩ dùng chung)
const getAllThuoc = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT id, ten_thuoc, don_vi, gia_thuoc, lieu_dung_mac_dinh, huong_dan_su_dung, trang_thai, ngay_tao, ngay_cap_nhat
            FROM Thuoc
            ORDER BY ten_thuoc ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy danh sách thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lấy thuốc đang hoạt động (Bác sĩ kê đơn - chỉ lấy thuốc active)
const getActiveThuoc = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT id, ten_thuoc, don_vi, gia_thuoc, lieu_dung_mac_dinh, huong_dan_su_dung
            FROM Thuoc
            WHERE trang_thai = 1
            ORDER BY ten_thuoc ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy thuốc hoạt động:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lấy chi tiết 1 thuốc
const getThuocById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Thuoc WHERE id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc!' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Lỗi lấy chi tiết thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Thêm thuốc mới (Admin)
const createThuoc = async (req, res) => {
    try {
        const { ten_thuoc, don_vi, gia_thuoc, lieu_dung_mac_dinh, huong_dan_su_dung } = req.body;
        
        if (!ten_thuoc || !don_vi) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên thuốc và đơn vị!' });
        }

        const pool = await connectDB();
        
        // Kiểm tra trùng tên thuốc
        const checkExist = await pool.request()
            .input('ten_thuoc', sql.NVarChar, ten_thuoc)
            .query('SELECT id FROM Thuoc WHERE ten_thuoc = @ten_thuoc');
        
        if (checkExist.recordset.length > 0) {
            return res.status(400).json({ message: 'Thuốc này đã tồn tại trong hệ thống!' });
        }

        await pool.request()
            .input('ten_thuoc', sql.NVarChar(200), ten_thuoc)
            .input('don_vi', sql.NVarChar(50), don_vi)
            .input('gia_thuoc', sql.Decimal(18, 2), gia_thuoc || 0)
            .input('lieu_dung_mac_dinh', sql.NVarChar(255), lieu_dung_mac_dinh || '')
            .input('huong_dan_su_dung', sql.NVarChar(500), huong_dan_su_dung || '')
            .query(`
                INSERT INTO Thuoc (ten_thuoc, don_vi, gia_thuoc, lieu_dung_mac_dinh, huong_dan_su_dung, trang_thai, ngay_tao, ngay_cap_nhat)
                VALUES (@ten_thuoc, @don_vi, @gia_thuoc, @lieu_dung_mac_dinh, @huong_dan_su_dung, 1, GETDATE(), GETDATE())
            `);

        res.status(201).json({ message: 'Thêm thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi thêm thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Sửa thuốc (Admin)
const updateThuoc = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_thuoc, don_vi, gia_thuoc, lieu_dung_mac_dinh, huong_dan_su_dung, trang_thai } = req.body;

        if (!ten_thuoc || !don_vi) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên thuốc và đơn vị!' });
        }

        const pool = await connectDB();

        // Kiểm tra thuốc tồn tại
        const checkExist = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM Thuoc WHERE id = @id');
        
        if (checkExist.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc!' });
        }

        // Kiểm tra trùng tên với thuốc khác
        const checkDuplicate = await pool.request()
            .input('ten_thuoc', sql.NVarChar, ten_thuoc)
            .input('id', sql.Int, id)
            .query('SELECT id FROM Thuoc WHERE ten_thuoc = @ten_thuoc AND id != @id');
        
        if (checkDuplicate.recordset.length > 0) {
            return res.status(400).json({ message: 'Tên thuốc này đã được sử dụng cho thuốc khác!' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('ten_thuoc', sql.NVarChar(200), ten_thuoc)
            .input('don_vi', sql.NVarChar(50), don_vi)
            .input('gia_thuoc', sql.Decimal(18, 2), gia_thuoc || 0)
            .input('lieu_dung_mac_dinh', sql.NVarChar(255), lieu_dung_mac_dinh || '')
            .input('huong_dan_su_dung', sql.NVarChar(500), huong_dan_su_dung || '')
            .input('trang_thai', sql.Bit, trang_thai !== undefined ? trang_thai : 1)
            .query(`
                UPDATE Thuoc SET
                    ten_thuoc = @ten_thuoc,
                    don_vi = @don_vi,
                    gia_thuoc = @gia_thuoc,
                    lieu_dung_mac_dinh = @lieu_dung_mac_dinh,
                    huong_dan_su_dung = @huong_dan_su_dung,
                    trang_thai = @trang_thai,
                    ngay_cap_nhat = GETDATE()
                WHERE id = @id
            `);

        res.json({ message: 'Cập nhật thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Xóa thuốc - Soft delete (Admin)
const deleteThuoc = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();

        const checkExist = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id FROM Thuoc WHERE id = @id');

        if (checkExist.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thuốc!' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Thuoc WHERE id = @id');

        res.json({ message: 'Xóa thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi xóa thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllThuoc, getActiveThuoc, getThuocById, createThuoc, updateThuoc, deleteThuoc };
