const { sql, connectDB } = require('../config/db');
const { BrevoClient } = require('@getbrevo/brevo');

// Hàm gửi email qua Brevo API (HTTPS - Không bị Render block, gửi được mọi email)
async function sendEmailBrevo(toEmail, subject, htmlContent) {
    if (!process.env.BREVO_API_KEY) {
        console.error('⚠️ BREVO_API_KEY chưa được cấu hình!');
        return;
    }
    try {
        const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

        await client.transactionalEmails.sendTransacEmail({
            sender: { name: 'TT Medical', email: 'ttmedicalcontact@gmail.com' },
            to: [{ email: toEmail }],
            subject,
            htmlContent
        });
        console.log(`✅ Email Brevo gửi thành công đến: ${toEmail}`);
    } catch (err) {
        console.error('❌ Lỗi gửi email Brevo:', err?.body || err?.response?.body || err.message);
    }
}

// Lấy TẤT CẢ lịch hẹn cho Admin
const getAllAppointments = async (req, res) => {
    try {
        const pool = await connectDB();
        const result = await pool.request().query(`
            SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, lk.ngay_tao, lk.gio_kham,
                   llv.ngay_lam_viec, llv.khung_gio,
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan, 
                   ISNULL(nd.so_dien_thoai, 'Chưa cập nhật') as so_dien_thoai,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si,
                   STT_Table.so_thu_tu
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
            LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
            LEFT JOIN ThanhToan tt ON lk.id = tt.lich_kham_id
            LEFT JOIN (
                SELECT id, ROW_NUMBER() OVER(PARTITION BY lich_lam_viec_id ORDER BY gio_kham ASC, ngay_tao ASC) as so_thu_tu
                FROM LichKham
                WHERE trang_thai != 'Cancelled'
            ) STT_Table ON lk.id = STT_Table.id
            WHERE tt.phuong_thuc_thanh_toan = 'cash' OR tt.trang_thai_thanh_toan = 1 OR tt.id IS NULL
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
                       ck.ten_chuyen_khoa,
                       tt.so_tien,
                       tt.phuong_thuc_thanh_toan,
                       dg.so_sao as diem_danh_gia,
                       dg.id as danh_gia_id,
                       dg.noi_dung as nhan_xet,
                       STT_Table.so_thu_tu
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
                LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
                LEFT JOIN HoSoBacSi hsbs ON bs_tk.id = hsbs.tai_khoan_id
                LEFT JOIN ChuyenKhoa ck ON hsbs.chuyen_khoa_id = ck.id
                LEFT JOIN DanhGia dg ON lk.id = dg.lich_kham_id
                LEFT JOIN ThanhToan tt ON lk.id = tt.lich_kham_id
                LEFT JOIN (
                    SELECT id, ROW_NUMBER() OVER(PARTITION BY lich_lam_viec_id ORDER BY gio_kham ASC, ngay_tao ASC) as so_thu_tu
                    FROM LichKham
                    WHERE trang_thai != 'Cancelled'
                ) STT_Table ON lk.id = STT_Table.id
                WHERE lk.benh_nhan_id = @benh_nhan_id
                  AND (tt.phuong_thuc_thanh_toan = 'cash' OR tt.trang_thai_thanh_toan = 1 OR tt.id IS NULL)
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
                       ISNULL(nd.so_dien_thoai, 'Chưa cập nhật') as so_dien_thoai,
                       STT_Table.so_thu_tu
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
                LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
                LEFT JOIN ThanhToan tt ON lk.id = tt.lich_kham_id
                LEFT JOIN (
                    SELECT id, ROW_NUMBER() OVER(PARTITION BY lich_lam_viec_id ORDER BY gio_kham ASC, ngay_tao ASC) as so_thu_tu
                    FROM LichKham
                    WHERE trang_thai != 'Cancelled'
                ) STT_Table ON lk.id = STT_Table.id
                WHERE llv.bac_si_id = @bac_si_id
                  AND (tt.phuong_thuc_thanh_toan = 'cash' OR tt.trang_thai_thanh_toan = 1 OR tt.id IS NULL)
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

        // Lấy trạng thái cũ và ngày giờ khám để kiểm tra
        const oldStatusQuery = await pool.request().input('id', sql.Int, id).query(`
            SELECT lk.trang_thai, lk.lich_lam_viec_id, llv.ngay_lam_viec, lk.gio_kham 
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            WHERE lk.id = @id
        `);
        if (oldStatusQuery.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });
        const rowInfo = oldStatusQuery.recordset[0];
        const oldStatus = rowInfo.trang_thai;

        // Bác sĩ KHÔNG được quyền hủy lịch
        if (trang_thai === 'Cancelled') {
            return res.status(400).json({ message: 'Bác sĩ không có quyền hủy lịch. Chỉ Admin mới có thể hủy lịch khi sát giờ khám (dưới 30 phút)!' });
        }

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
                    const cancelHtml = `
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
                    `;
                    sendEmailBrevo(
                        info.email_benh_nhan,
                        `[TT Medical] Thông báo HỦY lịch khám - Lịch khám #${info.id}`,
                        cancelHtml
                    );
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

// Đặt lịch khám mới (Cũ - Giữ lại theo yêu cầu)
const createAppointment1 = async (req, res) => {
    try {
        const { lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung } = req.body;
        const pool = await connectDB();

        await pool.request()
            .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
            .input('benh_nhan_id', sql.Int, benh_nhan_id)
            .input('mo_ta_trieu_chung', sql.NVarChar, mo_ta_trieu_chung)
            .query(`
                INSERT INTO LichKham (lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung, trang_thai, ngay_tao)
                VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, 'Pending', GETDATE())
            `);

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

        const appInfo = await pool.request().input('id', sql.Int, id).query(`
            SELECT lk.lich_lam_viec_id, lk.trang_thai, llv.ngay_lam_viec, lk.gio_kham 
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            WHERE lk.id = @id
        `);
        if (appInfo.recordset.length === 0) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });

        const rowInfo = appInfo.recordset[0];
        const { lich_lam_viec_id, trang_thai } = rowInfo;

        if (trang_thai.trim().toLowerCase() === 'done') {
            return res.status(400).json({ message: 'Không thể hủy lịch đã khám xong! Dữ liệu này cần được giữ lại làm hồ sơ bệnh án và bảo vệ đánh giá của bệnh nhân.' });
        }

        // Kiểm tra thời gian: Admin CHỈ được hủy nếu còn <= 30 phút trước giờ khám
        const d = new Date(rowInfo.ngay_lam_viec);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const date = d.getUTCDate();
        
        const gioKhamStr = rowInfo.gio_kham ? rowInfo.gio_kham.split(' - ')[0] : '00:00';
        const [gio, phut] = gioKhamStr.split(':');
        const localAppointmentDate = new Date(year, month, date, parseInt(gio), parseInt(phut), 0);
        
        const now = new Date();
        const diffInMinutes = (localAppointmentDate - now) / (1000 * 60);

        if (diffInMinutes > 30) {
            return res.status(400).json({ message: 'Chưa đến thời gian cho phép hủy lịch! Admin chỉ có quyền hủy lịch nếu bệnh nhân không đến khi còn cách giờ khám dưới 30 phút.' });
        }

        // KIỂM TRA LOGIC THANH TOÁN (Tránh mất tiền của khách hàng)
        const paymentCheck = await pool.request().input('id', sql.Int, id).query('SELECT phuong_thuc_thanh_toan, trang_thai_thanh_toan FROM ThanhToan WHERE lich_kham_id = @id');
        if (paymentCheck.recordset.length > 0) {
            const payment = paymentCheck.recordset[0];
            // Chỉ chặn hủy nếu thanh toán Chuyển khoản (transfer) và đã chuyển tiền thành công (1)
            if ((payment.phuong_thuc_thanh_toan === 'transfer' || payment.phuong_thuc_thanh_toan === 'momo') && payment.trang_thai_thanh_toan === 1) {
                return res.status(400).json({ message: 'Lịch khám này đã được thanh toán Online. Vui lòng liên hệ quầy tiếp đón để hoàn tiền trước khi hủy!' });
            }
        }

        if (trang_thai.trim().toLowerCase() !== 'cancelled') {
            await pool.request().input('lich_lam_viec_id', sql.Int, lich_lam_viec_id).query('UPDATE LichLamViec SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END WHERE id = @lich_lam_viec_id');
        }

        // Thực hiện Xóa mềm (Soft Delete) - Cập nhật trạng thái thành Cancelled
        await pool.request().input('id', sql.Int, id).query("UPDATE LichKham SET trang_thai = 'Cancelled' WHERE id = @id");

        res.json({ message: 'Hủy lịch hẹn thành công!' });
    } catch (error) {
        console.error('Lỗi hủy lịch hẹn:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// API: Lấy danh sách các giờ đã được đặt
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
                LEFT JOIN ThanhToan tt ON lk.id = tt.lich_kham_id
                WHERE llv.bac_si_id = @bac_si_id 
                AND CAST(llv.ngay_lam_viec AS DATE) = CAST(@ngay_lam_viec AS DATE)
                AND lk.trang_thai != 'Cancelled'
                AND lk.gio_kham IS NOT NULL
                AND (tt.phuong_thuc_thanh_toan = 'cash' OR tt.trang_thai_thanh_toan = 1 OR tt.id IS NULL)
            `);

        const bookedSlots = result.recordset.map(record => record.gio_kham);
        res.json(bookedSlots);
    } catch (error) {
        console.error('Lỗi getBookedSlots:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// =========================================================================
// API CHÍNH: TẠO LỊCH KHÁM MỚI (TÍCH HỢP TRANSACTION & BẢNG THANH TOÁN)
// =========================================================================
const createAppointment = async (req, res) => {
    try {
        const { benh_nhan_id, bac_si_id, ngay_lam_viec, khung_gio, mo_ta_trieu_chung, ho_ten, email, phuong_thuc_thanh_toan } = req.body;
        const pool = await connectDB();

        // Xử lý logic phương thức thanh toán
        const ptttoan = phuong_thuc_thanh_toan || 'cash';

        // BAN ĐẦU LUÔN LÀ 0 (Chưa thanh toán). Chuyển khoản thì đợi Webhook, Tiền mặt thì thu tại quầy.
        const trang_thai_tt = 0;

        // Khởi tạo Transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Tìm lich_lam_viec_id tương ứng với bác sĩ và ngày
            const shiftQuery = await new sql.Request(transaction)
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

            if (shiftQuery.recordset.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Bác sĩ không có ca làm việc ngày này!' });
            }
            const lich_lam_viec_id = shiftQuery.recordset[0].id;
            const phi_kham = shiftQuery.recordset[0].phi_kham || 0;
            const ten_bac_si = shiftQuery.recordset[0].ten_bac_si;
            const tong_tien = phi_kham ? Number(phi_kham).toLocaleString('en-US') : '0';

            // 2. Lưu vào CSDL Bảng LichKham
            const result = await new sql.Request(transaction)
                .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
                .input('benh_nhan_id', sql.Int, benh_nhan_id)
                .input('gio_kham', sql.VarChar, khung_gio)
                .input('mo_ta_trieu_chung', sql.NVarChar, mo_ta_trieu_chung)
                .input('trang_thai', sql.VarChar, 'Approved')
                .query(`
                    INSERT INTO LichKham (lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung, trang_thai, ngay_tao, gio_kham) 
                    OUTPUT inserted.id
                    VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, @trang_thai, GETDATE(), @gio_kham);
                `);

            const appointmentId = result.recordset[0].id;

            // NẾU LÀ TIỀN MẶT -> Tăng số lượng ca làm việc luôn
            // NẾU CHUYỂN KHOẢN -> Không tăng, đợi Webhook báo thành công mới tăng.
            if (ptttoan === 'cash') {
                await new sql.Request(transaction)
                    .input('lich_lam_viec_id', sql.Int, lich_lam_viec_id)
                    .query(`UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id`);
            }

            // 3. Lưu vào Bảng ThanhToan
            await new sql.Request(transaction)
                .input('lich_kham_id', sql.Int, appointmentId)
                .input('so_tien', sql.Decimal(18, 2), phi_kham)
                .input('phuong_thuc', sql.VarChar(50), ptttoan)
                .input('trang_thai_tt', sql.Int, trang_thai_tt)
                .query(`
                    INSERT INTO ThanhToan (lich_kham_id, so_tien, phuong_thuc_thanh_toan, trang_thai_thanh_toan, ngay_tao)
                    VALUES (@lich_kham_id, @so_tien, @phuong_thuc, @trang_thai_tt, GETDATE());
                `);

            // GỌI API PAYOS TẠO MÃ QR NẾU LÀ THANH TOÁN MOMO 
            let payosQrCode = null;
            if (ptttoan === 'momo') {
                const crypto = require('crypto');
                const clientId = process.env.PAYOS_CLIENT_ID;
                const apiKey = process.env.PAYOS_API_KEY;
                const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
                const orderCode = appointmentId;
                const amount = parseInt(phi_kham) < 2000 ? 2000 : parseInt(phi_kham);

                // Lọc bỏ dấu tiếng Việt và ký tự đặc biệt để nội dung thanh toán không bị lỗi font
                const removeAccents = (str) => {
                    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9 ]/g, '');
                };
                const patientNameNoAccent = removeAccents(ho_ten).toUpperCase();
                let description = `TTMED ${appointmentId} BN ${patientNameNoAccent}`;

                // PayOS giới hạn nội dung chuyển khoản tối đa chỉ được 25 ký tự
                if (description.length > 25) description = description.substring(0, 25).trim();

                const cancelUrl = process.env.FRONTEND_URL;
                const returnUrl = process.env.FRONTEND_URL;

                const signData = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
                const signature = crypto.createHmac('sha256', checksumKey).update(signData).digest('hex');

                const body = { orderCode, amount, description, cancelUrl, returnUrl, signature };

                const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
                    method: 'POST',
                    headers: { 'x-client-id': clientId, 'x-api-key': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const payosData = await payosRes.json();

                if (payosData.code === '00') {
                    payosQrCode = payosData.data.qrCode;
                } else {
                    await transaction.rollback();
                    return res.status(400).json({ message: 'Lỗi cấu hình PayOS: ' + payosData.desc });
                }
            }

            // MỌI THỨ HOÀN HẢO -> LƯU VÀO DB
            await transaction.commit();

            // NẾU LÀ TIỀN MẶT: Gửi Email thành công luôn. NẾU CHUYỂN KHOẢN: Đợi Webhook gửi.
            if (ptttoan === 'cash' && email) {
                sendConfirmationEmail(email, ho_ten, ten_bac_si, appointmentId, ngay_lam_viec, khung_gio, mo_ta_trieu_chung, tong_tien, false);
            }

            // Trả về số tiền để frontend tạo mã QR nếu là chuyển khoản
            res.status(201).json({ message: 'Tạo đơn thành công!', appointmentId, phi_kham, payosQrCode });

        } catch (transErr) {
            // LỖI: HOÀN TÁC TOÀN BỘ DB VỀ NHƯ CŨ
            await transaction.rollback();
            console.error('Lỗi Transaction (Rollback DB):', transErr);
            return res.status(500).json({ message: 'Lỗi lưu dữ liệu. Đã hủy bỏ giao dịch!' });
        }

    } catch (error) {
        console.error('Lỗi kết nối hoặc xử lý server:', error);
        res.status(500).json({ message: 'Lỗi hệ thống máy chủ' });
    }
};

// 6. Đánh giá Bác sĩ lưu vào bảng DanhGia
const rateAppointment = async (req, res) => {
    try {
        const lich_kham_id = req.params.id;
        const { diem_danh_gia, nhan_xet } = req.body;
        const pool = await connectDB();

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

        const checkRated = await pool.request().input('lich_kham_id', sql.Int, lich_kham_id).query('SELECT id FROM DanhGia WHERE lich_kham_id = @lich_kham_id');
        if (checkRated.recordset.length > 0) return res.status(400).json({ message: 'Bạn đã đánh giá lịch khám này rồi!' });

        await pool.request().input('benh_nhan_id', sql.Int, benh_nhan_id).query(`
            IF NOT EXISTS (SELECT 1 FROM HoSoBenhNhan WHERE tai_khoan_id = @benh_nhan_id)
            BEGIN INSERT INTO HoSoBenhNhan (tai_khoan_id) VALUES (@benh_nhan_id) END
        `);

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


// HÀM GỬI EMAIL DÙNG CHUNG
const sendConfirmationEmail = (email, ho_ten, ten_bac_si, appointmentId, ngay_lam_viec, khung_gio, mo_ta_trieu_chung, tong_tien, isTransferPaid) => {
    const dateObj = new Date(ngay_lam_viec);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

    const textTrangThaiThanhToan = isTransferPaid ?
        `<span style="color: #10B981;">Đã thanh toán (Online)</span>` :
        `<span style="color: #F59E0B;">Chưa thanh toán (Thu tại quầy)</span>`;

    const htmlContent = `
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
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Tổng tiền: </strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${tong_tien} VND</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Trạng thái: </strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${textTrangThaiThanhToan}</td></tr>
                </table>
                <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
                <p style="margin-top: 20px;">Vui lòng có mặt trước 15 phút tại bệnh viện để làm thủ tục check-in.</p>
                <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
            </div>
        </div>
    `;

    sendEmailBrevo(
        email,
        `[TT Medical] Xác nhận đặt lịch thành công - Lịch khám #${appointmentId}`,
        htmlContent
    );
}

// WEBHOOK XỬ LÝ THANH TOÁN TỰ ĐỘNG (Tương thích Casso + SePay)
const cassoWebhook = async (req, res) => {
    try {
        console.log("=== CÓ TIỀN VỀ! DỮ LIỆU WEBHOOK GỬI CHO BẠN LÀ: ===");
        console.log(JSON.stringify(req.body, null, 2));

        let transactions = [];

        // === TƯƠNG THÍCH CẢ CASSO VÀ SEPAY ===
        if (req.body.transferType) {
            // FORMAT SEPAY: Dữ liệu giao dịch nằm trực tiếp trong req.body
            // Chỉ xử lý tiền VÀO (transferType = "in")
            if (req.body.transferType === 'in') {
                transactions = [{
                    description: req.body.content || '',
                    amount: req.body.transferAmount || 0
                }];
            }
        } else {
            // FORMAT CASSO: Dữ liệu nằm trong req.body.data (mảng hoặc object)
            let rawData = req.body.data;
            if (Array.isArray(rawData)) {
                transactions = rawData;
            } else if (rawData && Array.isArray(rawData.records)) {
                transactions = rawData.records;
            } else if (rawData && typeof rawData === 'object') {
                transactions = [rawData];
            }
        }

        if (transactions.length === 0) {
            console.log("❌ Không tìm thấy giao dịch hợp lệ trong payload.");
            return res.status(200).json({ success: true });
        }

        const pool = await connectDB();

        for (const transaction of transactions) {
            // Tương thích mọi định dạng: Casso (description), SePay (content)
            const description = (transaction.description || transaction.content || transaction.remark || '').toUpperCase();
            const amountPaid = parseFloat(transaction.amount || transaction.transferAmount || 0);

            console.log(`\n➡️ Đang xử lý giao dịch: +${amountPaid} VNĐ`);
            console.log(`➡️ Nội dung: "${description}"`);

            if (!description) {
                console.log("❌ BỎ QUA: Giao dịch không có nội dung chuyển khoản.");
                continue;
            }

            const match = description.match(/TTMED\s*(\d+)/);

            if (match) {
                const appointmentId = parseInt(match[1]);
                console.log(`✅ Tìm thấy Mã lịch khám: #${appointmentId}`);

                const checkThanhToan = await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
                    SELECT tt.id, tt.so_tien, lk.gio_kham, lk.mo_ta_trieu_chung, llv.ngay_lam_viec,
                           tk.email as email_benh_nhan,
                           ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan,
                           ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
                    FROM ThanhToan tt
                    JOIN LichKham lk ON tt.lich_kham_id = lk.id
                    JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                    JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
                    LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
                    JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
                    LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
                    WHERE tt.lich_kham_id = @lich_kham_id AND tt.trang_thai_thanh_toan = 0
                `);

                if (checkThanhToan.recordset.length > 0) {
                    const info = checkThanhToan.recordset[0];
                    console.log(`✅ Cần thu: ${info.so_tien} VNĐ | Khách chuyển: ${amountPaid} VNĐ`);

                    // Ép kiểu float an toàn để so sánh
                    if (amountPaid >= parseFloat(info.so_tien)) {
                        console.log("✅ Đủ tiền! Tiến hành cập nhật Database...");

                        await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
                            UPDATE ThanhToan SET trang_thai_thanh_toan = 1, ngay_thanh_toan = GETDATE() WHERE lich_kham_id = @lich_kham_id;
                            UPDATE LichKham SET trang_thai = 'Approved' WHERE id = @lich_kham_id;
                            DECLARE @lich_lam_viec_id INT;
                            SELECT @lich_lam_viec_id = lich_lam_viec_id FROM LichKham WHERE id = @lich_kham_id;
                            UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id;
                        `);

                        if (info.email_benh_nhan) {
                            console.log("✅ Gửi email xác nhận...");
                            const tong_tien = Number(info.so_tien).toLocaleString('en-US');
                            sendConfirmationEmail(info.email_benh_nhan, info.ten_benh_nhan, info.ten_bac_si, appointmentId, info.ngay_lam_viec, info.gio_kham, info.mo_ta_trieu_chung, tong_tien, true);
                        }
                        console.log(" CẬP NHẬT THÀNH CÔNG!");
                    } else {
                        console.log(` TỪ CHỐI: Khách chuyển THIẾU TIỀN!`);
                    }
                } else {
                    console.log("TỪ CHỐI: Lịch hẹn đã được thanh toán hoặc ID không tồn tại.");
                }
            } else {
                console.log("TỪ CHỐI: Nội dung chuyển khoản không chứa mã TTMED hợp lệ.");
            }
        }
        console.log("================================================\n");
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Webhook Error:", error);
        res.status(500).send('Server Error');
    }
};

// WEBHOOK PAYOS XỬ LÝ THANH TOÁN MOMO TỰ ĐỘNG
const payosWebhook = async (req, res) => {
    try {
        const { data, success } = req.body;
        if (!success || !data) return res.status(200).json({ success: true });

        const appointmentId = data.orderCode;
        const amountPaid = data.amount;

        const pool = await connectDB();

        const checkThanhToan = await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
            SELECT tt.id, tt.so_tien, lk.gio_kham, lk.mo_ta_trieu_chung, llv.ngay_lam_viec,
                   tk.email as email_benh_nhan,
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
            FROM ThanhToan tt
            JOIN LichKham lk ON tt.lich_kham_id = lk.id
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
            LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
            WHERE tt.lich_kham_id = @lich_kham_id AND tt.trang_thai_thanh_toan = 0
        `);

        if (checkThanhToan.recordset.length > 0) {
            const info = checkThanhToan.recordset[0];
            const soTienCanThu = parseFloat(info.so_tien);

            if (amountPaid >= soTienCanThu || amountPaid >= 2000) {
                await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
                    UPDATE ThanhToan SET trang_thai_thanh_toan = 1, ngay_thanh_toan = GETDATE() WHERE lich_kham_id = @lich_kham_id;
                    UPDATE LichKham SET trang_thai = 'Approved' WHERE id = @lich_kham_id;
                    DECLARE @lich_lam_viec_id INT;
                    SELECT @lich_lam_viec_id = lich_lam_viec_id FROM LichKham WHERE id = @lich_kham_id;
                    UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id;
                `);

                if (info.email_benh_nhan) {
                    const tong_tien = Number(info.so_tien).toLocaleString('en-US');
                    sendConfirmationEmail(info.email_benh_nhan, info.ten_benh_nhan, info.ten_bac_si, appointmentId, info.ngay_lam_viec, info.gio_kham, info.mo_ta_trieu_chung, tong_tien, true);
                }
            }
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

// API Kiểm tra trạng thái thanh toán (Dành cho vòng lặp Frontend)
const checkPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();
        const result = await pool.request().input('lich_kham_id', sql.Int, id).query(`
            SELECT trang_thai_thanh_toan FROM ThanhToan WHERE lich_kham_id = @lich_kham_id
        `);

        if (result.recordset.length === 0) return res.status(404).json({ paid: false });

        res.json({ paid: result.recordset[0].trang_thai_thanh_toan === 1 || result.recordset[0].trang_thai_thanh_toan === true });
    } catch (error) {
        res.status(500).json({ paid: false });
    }
};

// Hủy lịch hẹn chưa thanh toán (Khi bấm quay lại hoặc hết giờ)
const deleteUnpaidAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectDB();

        const check = await pool.request().input('id', sql.Int, id).query(`
            SELECT tt.trang_thai_thanh_toan 
            FROM LichKham lk 
            JOIN ThanhToan tt ON lk.id = tt.lich_kham_id 
            WHERE lk.id = @id
        `);

        if (check.recordset.length > 0 && check.recordset[0].trang_thai_thanh_toan === 0) {
            await pool.request().input('id', sql.Int, id).query(`
                DELETE FROM ThanhToan WHERE lich_kham_id = @id;
                DELETE FROM LichKham WHERE id = @id;
            `);
            res.json({ message: 'Đã xóa lịch hẹn chưa thanh toán' });
        } else {
            res.status(400).json({ message: 'Không thể xóa lịch hẹn này' });
        }
    } catch (err) {
        console.error('Lỗi khi xóa lịch chưa thanh toán:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { getAllAppointments, getAppointmentsByDoctor, getAppointmentsByPatient, updateAppointmentStatus, updateAppointmentNote, deleteAppointment, createAppointment1, createAppointment, getBookedSlots, rateAppointment, cassoWebhook, payosWebhook, checkPaymentStatus, deleteUnpaidAppointment };