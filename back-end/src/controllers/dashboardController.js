const { sql, connectDB } = require('../config/db');

const getStats = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT vt.ten_vai_tro, COUNT(tk.id) as so_luong
            FROM TaiKhoan tk
            JOIN VaiTro vt ON tk.vai_tro_id = vt.id
            WHERE tk.trang_thai = 1
            GROUP BY vt.ten_vai_tro
        `);

        let stats = {
            bac_si: 0,
            benh_nhan: 0,
            admin: 0
        };

        result.recordset.forEach(row => {
            if (row.ten_vai_tro === 'BacSi') stats.bac_si = row.so_luong;
            else if (row.ten_vai_tro === 'BenhNhan') stats.benh_nhan = row.so_luong;
            else if (row.ten_vai_tro === 'Admin' || row.ten_vai_tro === 'Quản trị viên') stats.admin = row.so_luong;
        });

        res.json(stats);
    } catch (error) {
        console.error('Lỗi lấy thống kê tổng quan:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const getRevenue = async (req, res) => {
    try {
        const { mode, date } = req.query;
        const pool = await connectDB();
        
        let labels = [];
        let data = [];
        
        const inputDate = new Date(date || new Date());
        const year = inputDate.getFullYear();

        // Tính doanh thu theo ngày hẹn khám (llv.ngay_lam_viec)
        if (mode === 'week') {
            const dayOfWeek = inputDate.getDay();
            const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(inputDate.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const result = await pool.request()
                .input('start_date', sql.Date, monday)
                .input('end_date', sql.Date, sunday)
                .query(`
                    SELECT CAST(llv.ngay_lam_viec AS DATE) as ngay, SUM(tt.so_tien) as tong_doanh_thu
                    FROM ThanhToan tt
                    JOIN LichKham lk ON tt.lich_kham_id = lk.id
                    JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                    WHERE tt.trang_thai_thanh_toan = 1
                      AND CAST(llv.ngay_lam_viec AS DATE) BETWEEN @start_date AND @end_date
                    GROUP BY CAST(llv.ngay_lam_viec AS DATE)
                    ORDER BY ngay
                `);

            const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(monday);
                currentDay.setDate(monday.getDate() + i);
                const dayStr = `${String(currentDay.getDate()).padStart(2, '0')}/${String(currentDay.getMonth() + 1).padStart(2, '0')}`;
                labels.push(`${days[i]} (${dayStr})`);
                
                const row = result.recordset.find(r => {
                    const rDate = new Date(r.ngay);
                    return rDate.getDate() === currentDay.getDate() && rDate.getMonth() === currentDay.getMonth();
                });
                data.push(row ? row.tong_doanh_thu : 0);
            }
        } else if (mode === 'month') {
            const numDays = new Date(year, inputDate.getMonth() + 1, 0).getDate();
            const result = await pool.request()
                .input('year', sql.Int, year)
                .input('month', sql.Int, inputDate.getMonth() + 1)
                .query(`
                    SELECT DAY(llv.ngay_lam_viec) as ngay_trong_thang, SUM(tt.so_tien) as tong_doanh_thu
                    FROM ThanhToan tt
                    JOIN LichKham lk ON tt.lich_kham_id = lk.id
                    JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                    WHERE tt.trang_thai_thanh_toan = 1
                      AND YEAR(llv.ngay_lam_viec) = @year AND MONTH(llv.ngay_lam_viec) = @month
                    GROUP BY DAY(llv.ngay_lam_viec)
                    ORDER BY ngay_trong_thang
                `);
            
            for (let i = 1; i <= numDays; i++) {
                labels.push(`${i}`);
                const row = result.recordset.find(r => r.ngay_trong_thang === i);
                data.push(row ? row.tong_doanh_thu : 0);
            }
        } else {
            const result = await pool.request()
                .input('year', sql.Int, year)
                .query(`
                    SELECT MONTH(llv.ngay_lam_viec) as thang, SUM(tt.so_tien) as tong_doanh_thu
                    FROM ThanhToan tt
                    JOIN LichKham lk ON tt.lich_kham_id = lk.id
                    JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                    WHERE tt.trang_thai_thanh_toan = 1
                      AND YEAR(llv.ngay_lam_viec) = @year
                    GROUP BY MONTH(llv.ngay_lam_viec)
                    ORDER BY thang
                `);
            
            for (let i = 1; i <= 12; i++) {
                labels.push(`Tháng ${i}`);
                const row = result.recordset.find(r => r.thang === i);
                data.push(row ? row.tong_doanh_thu : 0);
            }
        }
        
        res.json({ labels, data });
    } catch (error) {
        console.error('Lỗi lấy doanh thu:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getStats, getRevenue };
