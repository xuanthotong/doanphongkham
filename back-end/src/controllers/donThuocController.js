const { sql, connectDB } = require('../config/db');

// Lưu đơn thuốc cho 1 lịch khám (Bác sĩ kê đơn)
const saveDonThuoc = async (req, res) => {
    try {
        const { lich_kham_id, danh_sach_thuoc } = req.body;

        if (!lich_kham_id || !Array.isArray(danh_sach_thuoc) || danh_sach_thuoc.length === 0) {
            return res.status(400).json({ message: 'Thiếu thông tin đơn thuốc!' });
        }

        const pool = await connectDB();

        // Kiểm tra lịch khám tồn tại
        const checkLK = await pool.request()
            .input('lich_kham_id', sql.Int, lich_kham_id)
            .query('SELECT id FROM LichKham WHERE id = @lich_kham_id');

        if (checkLK.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lịch khám!' });
        }

        // Xóa đơn thuốc cũ (nếu có) rồi insert mới
        await pool.request()
            .input('lich_kham_id', sql.Int, lich_kham_id)
            .query('DELETE FROM DonThuoc WHERE lich_kham_id = @lich_kham_id');

        // Insert từng thuốc
        for (const thuoc of danh_sach_thuoc) {
            await pool.request()
                .input('lich_kham_id', sql.Int, lich_kham_id)
                .input('thuoc_id', sql.Int, thuoc.thuoc_id)
                .input('so_luong', sql.Int, thuoc.so_luong || 1)
                .input('lieu_dung', sql.NVarChar(255), thuoc.lieu_dung || '')
                .input('ghi_chu', sql.NVarChar, thuoc.ghi_chu || '')
                .query(`
                    INSERT INTO DonThuoc (lich_kham_id, thuoc_id, so_luong, lieu_dung, ghi_chu, ngay_tao)
                    VALUES (@lich_kham_id, @thuoc_id, @so_luong, @lieu_dung, @ghi_chu, GETDATE())
                `);
        }

        res.status(201).json({ message: 'Lưu đơn thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi lưu đơn thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Lấy đơn thuốc của 1 lịch khám (JOIN bảng Thuoc để lấy thông tin thuốc)
const getDonThuocByLichKham = async (req, res) => {
    try {
        const { lichKhamId } = req.params;
        const pool = await connectDB();

        const result = await pool.request()
            .input('lich_kham_id', sql.Int, lichKhamId)
            .query(`
                SELECT dt.id, dt.lich_kham_id, dt.thuoc_id, dt.so_luong, dt.lieu_dung, dt.ghi_chu, dt.ngay_tao,
                       t.ten_thuoc, t.don_vi, t.gia_thuoc, t.huong_dan_su_dung
                FROM DonThuoc dt
                JOIN Thuoc t ON dt.thuoc_id = t.id
                WHERE dt.lich_kham_id = @lich_kham_id
                ORDER BY dt.id ASC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy đơn thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Cập nhật đơn thuốc (xóa cũ + insert mới)
const updateDonThuoc = async (req, res) => {
    try {
        const { lichKhamId } = req.params;
        const { danh_sach_thuoc } = req.body;

        if (!Array.isArray(danh_sach_thuoc)) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ!' });
        }

        const pool = await connectDB();

        // Xóa đơn cũ
        await pool.request()
            .input('lich_kham_id', sql.Int, lichKhamId)
            .query('DELETE FROM DonThuoc WHERE lich_kham_id = @lich_kham_id');

        // Insert đơn mới (nếu có)
        for (const thuoc of danh_sach_thuoc) {
            await pool.request()
                .input('lich_kham_id', sql.Int, lichKhamId)
                .input('thuoc_id', sql.Int, thuoc.thuoc_id)
                .input('so_luong', sql.Int, thuoc.so_luong || 1)
                .input('lieu_dung', sql.NVarChar(255), thuoc.lieu_dung || '')
                .input('ghi_chu', sql.NVarChar, thuoc.ghi_chu || '')
                .query(`
                    INSERT INTO DonThuoc (lich_kham_id, thuoc_id, so_luong, lieu_dung, ghi_chu, ngay_tao)
                    VALUES (@lich_kham_id, @thuoc_id, @so_luong, @lieu_dung, @ghi_chu, GETDATE())
                `);
        }

        res.json({ message: 'Cập nhật đơn thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật đơn thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Xóa toàn bộ đơn thuốc của 1 lịch khám
const deleteDonThuoc = async (req, res) => {
    try {
        const { lichKhamId } = req.params;
        const pool = await connectDB();

        await pool.request()
            .input('lich_kham_id', sql.Int, lichKhamId)
            .query('DELETE FROM DonThuoc WHERE lich_kham_id = @lich_kham_id');

        res.json({ message: 'Xóa đơn thuốc thành công!' });
    } catch (error) {
        console.error('Lỗi xóa đơn thuốc:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { saveDonThuoc, getDonThuocByLichKham, updateDonThuoc, deleteDonThuoc };
