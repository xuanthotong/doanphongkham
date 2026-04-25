const { sql, connectDB } = require('../config/db');
const nodemailer = require('nodemailer');

// Cấu hình Email gửi đi 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ttmedicalcontact@gmail.com', 
        pass: 'ipzbnuabolatbqio' 
    }
});

// Lấy TẤT CẢ lịch hẹn cho Admin
const getAllAppointments = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao, lk.gio_kham,
                   llv.ngay_lam_viec, llv.khung_gio,
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan, 
                   ISNULL(nd.so_dien_thoai, 'Chưa cập nhật') as so_dien_thoai,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
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

// Lấy danh sách lịch hẹn của 1 bệnh nhân (Lịch sử khám)
const getAppointmentsByPatient = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('benh_nhan_id', sql.Int, id)
            .query(`
                SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao, lk.gio_kham,
                       llv.ngay_lam_viec, llv.khung_gio,
                       ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si,
                       dg.so_sao as diem_danh_gia,
                       dg.id as danh_gia_id,
                       dg.noi_dung as nhan_xet
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
                LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
                LEFT JOIN DanhGia dg ON lk.id = dg.lich_kham_id
                WHERE lk.benh_nhan_id = @benh_nhan_id
                ORDER BY lk.ngay_tao DESC, llv.ngay_lam_viec DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy lịch sử khám:', error);
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
                SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao, lk.gio_kham,
                       llv.ngay_lam_viec, llv.khung_gio,
                       ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan, 
                       ISNULL(nd.so_dien_thoai, 'Chưa cập nhật') as so_dien_thoai
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
                LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
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
        
        // Lấy trạng thái cũ để kiểm tra
        const oldStatusQuery = await pool.request().input('id', sql.Int, id).query('SELECT trang_thai, lich_lam_viec_id FROM LichKham WHERE id = @id');
        if (oldStatusQuery.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });
        const oldStatus = oldStatusQuery.recordset[0].trang_thai;

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
        
        // NẾU HỦY LỊCH VÀ TRƯỚC ĐÓ CHƯA HỦY
        if (trang_thai === 'Cancelled' && oldStatus !== 'Cancelled') {
            // Hoàn lại 1 chỗ trống cho ca làm việc để bệnh nhân khác có thể đặt
            await pool.request().input('lich_lam_viec_id', sql.Int, oldStatusQuery.recordset[0].lich_lam_viec_id)
                .query('UPDATE LichLamViec SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END WHERE id = @lich_lam_viec_id');

            const infoQuery = await pool.request().input('id', sql.Int, id).query(`
                SELECT lk.id, lk.gio_kham, llv.ngay_lam_viec, llv.id as lich_lam_viec_id,
                       tk.email as email_benh_nhan,
                       ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan,
                       ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
                LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
                JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
                LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
                WHERE lk.id = @id
            `);
            
            if (infoQuery.recordset.length > 0) {
                const info = infoQuery.recordset[0];
                const d = new Date(info.ngay_lam_viec);
                const ngay_kham_str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                

                if (info.email_benh_nhan) {
                    const mailOptions = {
                        from: '"TT Medical" <tongthobro456@gmail.com>',
                        to: info.email_benh_nhan,
                        subject: `[TT Medical] Thông báo HỦY lịch khám - Lịch khám #${info.id}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                                <div style="background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                                    <h2>Thông Báo Hủy Lịch Khám</h2>
                                </div>
                                <div style="padding: 20px; line-height: 1.6; color: #334155;">
                                    <p>Xin chào <strong>${info.ten_benh_nhan}</strong>,</p>
                                    <p>Chúng tôi rất tiếc phải thông báo rằng lịch khám của bạn đã bị <strong style="color: #EF4444;">HỦY</strong> bởi bác sĩ. Dưới đây là thông tin chi tiết:</p>
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Bác sĩ phụ trách:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">BS. ${info.ten_bac_si}</td></tr>
                                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Ngày hẹn ban đầu:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${ngay_kham_str}</td></tr>
                                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Giờ hẹn:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #10B981; font-weight: bold;">${info.gio_kham || 'Chưa cập nhật'}</td></tr>
                                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Lý do hủy:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #EF4444;">${ghi_chu_cua_bac_si || 'Không có lý do cụ thể'}</td></tr>
                                    </table>
                                    <p style="margin-top: 20px;">Thành thật xin lỗi quý khách vì sự bất tiện này. Vui lòng truy cập lại hệ thống để đặt một lịch khám khác.</p>
                                    <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
                                </div>
                            </div>
                        `
                    };
                    transporter.sendMail(mailOptions).catch(err => console.error('Lỗi gửi email hủy lịch:', err));
                }
            }
        }

        res.json({ message: 'Cập nhật trạng thái thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// Cập nhật riêng Ghi chú/Đơn thuốc của Bác sĩ
const updateAppointmentNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { ghi_chu_cua_bac_si } = req.body;
        const pool = await connectDB();

        // Kiểm tra xem lịch khám có tồn tại không
        const checkQuery = await pool.request().input('id', sql.Int, id).query('SELECT id FROM LichKham WHERE id = @id');
        if (checkQuery.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });

        await pool.request()
            .input('id', sql.Int, id)
            .input('ghi_chu', sql.NVarChar, ghi_chu_cua_bac_si)
            .query('UPDATE LichKham SET ghi_chu_cua_bac_si = @ghi_chu WHERE id = @id');

        res.json({ message: 'Cập nhật ghi chú thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật ghi chú:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 4. Đặt lịch khám mới (Bệnh nhân đặt lịch)
const createAppointment1 = async (req, res) => {
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
        
        const appInfo = await pool.request().input('id', sql.Int, id).query('SELECT lich_lam_viec_id, trang_thai FROM LichKham WHERE id = @id');
        if (appInfo.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });
        
        const { lich_lam_viec_id, trang_thai } = appInfo.recordset[0];
        
        // 1. CHẶN XÓA NẾU LỊCH ĐÃ KHÁM XONG
        if (trang_thai.trim().toLowerCase() === 'done') {
            return res.status(400).json({ message: 'Không thể xóa lịch đã khám xong! Dữ liệu này cần được giữ lại làm hồ sơ bệnh án và bảo vệ đánh giá của bệnh nhân.' });
        }
        
        // 2. Hoàn lại số lượng chỗ trống nếu lịch đang ở trạng thái Pending hoặc Approved
        if (trang_thai.trim().toLowerCase() !== 'cancelled') {
            await pool.request().input('lich_lam_viec_id', sql.Int, lich_lam_viec_id).query('UPDATE LichLamViec SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END WHERE id = @lich_lam_viec_id');
        }
        
        // 3. Tiến hành xóa lịch hẹn (Lúc này chắc chắn an toàn, không bị dính khóa ngoại của bảng Đánh Giá)
        await pool.request().input('id', sql.Int, id).query('DELETE FROM LichKham WHERE id = @id');
        res.json({ message: 'Xóa lịch hẹn thành công!' });
    } catch (error) {
        console.error('Lỗi xóa lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 1. API: Lấy danh sách các giờ đã được đặt để KHÓA LẠI ở Frontend
const getBookedSlots = async (req, res) => {
    try {
        const { bac_si_id, ngay } = req.query;
        const pool = await connectDB();
        
        const result = await pool.request()
            .input('bac_si_id', sql.Int, bac_si_id)
            .input('ngay_lam_viec', sql.Date, ngay)
            .query(`
                SELECT lk.gio_kham 
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                WHERE llv.bac_si_id = @bac_si_id 
                AND CAST(llv.ngay_lam_viec AS DATE) = CAST(@ngay_lam_viec AS DATE)
                AND lk.trang_thai != 'Cancelled'
                AND lk.gio_kham IS NOT NULL
            `);
            
        const bookedSlots = result.recordset.map(record => record.gio_kham);
        res.json(bookedSlots);
    } catch (error) {
        console.error('Lỗi getBookedSlots:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 2. API: Tạo lịch khám mới (Đồng bộ CSDL + Gửi Email)
const createAppointment = async (req, res) => {
    try {
        const { benh_nhan_id, bac_si_id, ngay_lam_viec, khung_gio, mo_ta_trieu_chung, ho_ten, email } = req.body;
        const pool = await connectDB();

        // 1. Tìm lich_lam_viec_id tương ứng với bác sĩ và ngày
        const shiftQuery = await pool.request()
            .input('bac_si_id', sql.Int, bac_si_id)
            .input('ngay_lam_viec', sql.Date, ngay_lam_viec)
            .query(`
                SELECT llv.id, hsbs.phi_kham, ISNULL(hsnd.ho_ten, tk.ten_dang_nhap) as ten_bac_si
                FROM LichLamViec llv
                LEFT JOIN HoSoBacSi hsbs ON llv.bac_si_id = hsbs.tai_khoan_id
                LEFT JOIN HoSoNguoiDung hsnd ON llv.bac_si_id = hsnd.tai_khoan_id
                LEFT JOIN TaiKhoan tk ON llv.bac_si_id = tk.id
                WHERE llv.bac_si_id = @bac_si_id AND CAST(llv.ngay_lam_viec AS DATE) = CAST(@ngay_lam_viec AS DATE)
            `);
            
        if (shiftQuery.recordset.length === 0) return res.status(400).json({ message: 'Bác sĩ không có ca làm việc ngày này!' });
        const lich_lam_viec_id = shiftQuery.recordset[0].id;
        const phi_kham = shiftQuery.recordset[0].phi_kham;
        const ten_bac_si = shiftQuery.recordset[0].ten_bac_si;
        const tong_tien = phi_kham ? Number(phi_kham).toLocaleString('en-US') : '0';

        // 2. Lưu vào CSDL
        const result = await pool.request()
            .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
            .input('benh_nhan_id', sql.Int, benh_nhan_id)
            .input('gio_kham', sql.VarChar, khung_gio)
            .input('mo_ta_trieu_chung', sql.NVarChar, mo_ta_trieu_chung)
            .input('trang_thai', sql.VarChar, 'Pending')
            .query(`
                INSERT INTO LichKham (lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung, trang_thai, ngay_tao, gio_kham) 
                OUTPUT inserted.id
                VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, @trang_thai, GETDATE(), @gio_kham);
                
                -- Tự động tăng số lượng hiện tại trong Ca làm việc
                UPDATE LichLamViec 
                SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 
                WHERE id = @lich_lam_viec_id;
            `);

        const appointmentId = result.recordset[0].id;

        // Tiến hành gửi Email bất đồng bộ (không block người dùng)
        if (email) {
            const dateObj = new Date(ngay_lam_viec);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

            const mailOptions = {
                from: '"TT Medical" <tongthobro456@gmail.com>',
                to: email,
                subject: `[TT Medical] Xác nhận đặt lịch thành công - Lịch khám #${appointmentId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="background-color: #0284C7; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h2>Xác Nhận Đặt Lịch Khám</h2>
                        </div>
                        <div style="padding: 20px; line-height: 1.6; color: #334155;">
                            <p>Xin chào <strong>${ho_ten}</strong>,</p>
                            <p>Lịch khám bệnh của bạn đã được ghi nhận trên hệ thống. Dưới đây là thông tin chi tiết:</p>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Bác sĩ:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">BS. ${ten_bac_si}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Mã lịch khám:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">#${appointmentId}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Ngày khám:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${formattedDate}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Giờ khám:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #10B981; font-weight: bold;">${khung_gio}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Triệu chứng:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${mo_ta_trieu_chung}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Tổng tiền khám bệnh: </strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${tong_tien} VND</td></tr>    
                            </table>
                            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
                            <p style="margin-top: 20px;">Vui lòng có mặt trước 15 phút tại bệnh viện để làm thủ tục check-in.</p>
                            <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
                        </div>
                    </div>
                `
            };
            transporter.sendMail(mailOptions).catch(err => console.error('Lỗi gửi email:', err));
        }

        res.status(201).json({ message: 'Đặt lịch thành công!', appointmentId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// 5. Đánh giá Bác sĩ lưu vào bảng DanhGia
const rateAppointment = async (req, res) => {
    try {
        const lich_kham_id = req.params.id;
        const { diem_danh_gia, nhan_xet } = req.body;
        const pool = await connectDB();

        // 1. Lấy thông tin lịch khám để biết Bệnh nhân và Bác sĩ
        const lkInfo = await pool.request().input('id', sql.Int, lich_kham_id).query(`
            SELECT lk.benh_nhan_id, llv.bac_si_id, lk.trang_thai
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            WHERE lk.id = @id
        `);

        if (lkInfo.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch khám!' });
        if (lkInfo.recordset[0].trang_thai.trim().toLowerCase() !== 'done') {
            return res.status(400).json({ message: 'Lịch khám chưa hoàn thành, không thể đánh giá!' });
        }

        const { benh_nhan_id, bac_si_id } = lkInfo.recordset[0];

        // 2. Kiểm tra xem đã đánh giá chưa
        const checkRated = await pool.request().input('lich_kham_id', sql.Int, lich_kham_id).query('SELECT id FROM DanhGia WHERE lich_kham_id = @lich_kham_id');
        if (checkRated.recordset.length > 0) return res.status(400).json({ message: 'Bạn đã đánh giá lịch khám này rồi!' });

        // 3. Đảm bảo Bệnh nhân có trong bảng HoSoBenhNhan (Chống lỗi Khóa ngoại - Foreign Key)
        await pool.request().input('benh_nhan_id', sql.Int, benh_nhan_id).query(`
            IF NOT EXISTS (SELECT 1 FROM HoSoBenhNhan WHERE tai_khoan_id = @benh_nhan_id)
            BEGIN INSERT INTO HoSoBenhNhan (tai_khoan_id) VALUES (@benh_nhan_id) END
        `);

        // 4. Lưu vào bảng DanhGia
        await pool.request()
            .input('lich_kham_id', sql.Int, lich_kham_id).input('benh_nhan_id', sql.Int, benh_nhan_id).input('bac_si_id', sql.Int, bac_si_id)
            .input('so_sao', sql.Int, diem_danh_gia).input('noi_dung', sql.NVarChar, nhan_xet)
            .query(`INSERT INTO DanhGia (lich_kham_id, benh_nhan_id, bac_si_id, so_sao, noi_dung, ngay_danh_gia) VALUES (@lich_kham_id, @benh_nhan_id, @bac_si_id, @so_sao, @noi_dung, GETDATE())`);

        res.json({ message: 'Cảm ơn bạn đã đánh giá Bác sĩ!' });
    } catch (error) {
        console.error('Lỗi đánh giá bác sĩ:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllAppointments, getAppointmentsByDoctor, getAppointmentsByPatient, updateAppointmentStatus, updateAppointmentNote, deleteAppointment, createAppointment1,  createAppointment, getBookedSlots, rateAppointment };