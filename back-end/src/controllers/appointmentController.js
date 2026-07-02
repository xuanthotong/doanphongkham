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

// Hàm tự động hủy lịch hẹn nếu quá giờ khám 1 tiếng
const autoCancelExpiredAppointments = async (pool) => {
    try {
        // Bước 1: Lấy danh sách lịch hẹn hết hạn kèm thông tin bệnh nhân để gửi email
        const expiredResult = await pool.request().query(`
            SELECT lk.id, lk.lich_lam_viec_id, lk.gio_kham,
                   llv.ngay_lam_viec,
                   tk.email as email_benh_nhan,
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            JOIN TaiKhoan tk ON lk.benh_nhan_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
            LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
            WHERE lk.trang_thai IN ('Pending', 'Approved')
              AND lk.gio_kham IS NOT NULL AND LEN(lk.gio_kham) >= 5
              AND DATEADD(minute, 60, CAST(CONVERT(VARCHAR(10), llv.ngay_lam_viec, 120) + ' ' + LEFT(lk.gio_kham, 5) AS DATETIME)) < DATEADD(hour, 7, GETUTCDATE())
        `);

        const expiredList = expiredResult.recordset;
        if (expiredList.length === 0) return; // Không có lịch nào hết hạn

        // Bước 2: Hủy lịch và hoàn slot trong DB (bulk SQL)
        await pool.request().query(`
            DECLARE @Expired TABLE (id INT, lich_lam_viec_id INT);

            INSERT INTO @Expired (id, lich_lam_viec_id)
            SELECT lk.id, lk.lich_lam_viec_id
            FROM LichKham lk
            JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
            WHERE lk.trang_thai IN ('Pending', 'Approved')
              AND lk.gio_kham IS NOT NULL AND LEN(lk.gio_kham) >= 5
              AND DATEADD(minute, 60, CAST(CONVERT(VARCHAR(10), llv.ngay_lam_viec, 120) + ' ' + LEFT(lk.gio_kham, 5) AS DATETIME)) < DATEADD(hour, 7, GETUTCDATE());

            IF EXISTS (SELECT 1 FROM @Expired)
            BEGIN
                -- Hoàn lại chỗ cho ca làm việc
                UPDATE llv
                SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END
                FROM LichLamViec llv
                JOIN @Expired e ON llv.id = e.lich_lam_viec_id;

                -- Hủy lịch khám
                UPDATE lk
                SET trang_thai = 'Cancelled',
                    ghi_chu_cua_bac_si = N'Hệ thống tự động hủy do bệnh nhân không đến khám đúng giờ'
                FROM LichKham lk
                JOIN @Expired e ON lk.id = e.id;
            END
        `);

        // Bước 3: Gửi email thông báo hủy cho từng bệnh nhân
        for (const info of expiredList) {
            if (!info.email_benh_nhan) continue;
            try {
                const d = new Date(info.ngay_lam_viec);
                const ngay_kham_str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

                const cancelHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h2>Thông Báo Hủy Lịch Khám</h2>
                        </div>
                        <div style="padding: 20px; line-height: 1.6; color: #334155;">
                            <p>Xin chào <strong>${info.ten_benh_nhan}</strong>,</p>
                            <p>Chúng tôi rất tiếc phải thông báo rằng lịch khám của bạn đã bị <strong style="color: #EF4444;">HỦY TỰ ĐỘNG</strong> bởi hệ thống do bạn không đến khám đúng giờ. Dưới đây là thông tin chi tiết:</p>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Mã lịch khám:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">#${info.id}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Bác sĩ phụ trách:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">BS. ${info.ten_bac_si}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Ngày hẹn:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${ngay_kham_str}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Giờ hẹn:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #10B981; font-weight: bold;">${info.gio_kham || 'Chưa cập nhật'}</td></tr>
                                <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Lý do hủy:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #EF4444;">Hệ thống tự động hủy do bệnh nhân không đến khám đúng giờ</td></tr>
                            </table>
                            <p style="margin-top: 20px;">Nếu bạn muốn đặt lịch khám mới, vui lòng truy cập lại hệ thống để chọn ngày giờ phù hợp.</p>
                            <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
                        </div>
                    </div>
                `;

                sendEmailBrevo(
                    info.email_benh_nhan,
                    `[TT Medical] Thông báo HỦY lịch khám tự động - Lịch khám #${info.id}`,
                    cancelHtml
                );
                console.log(`📧 Đã gửi email hủy tự động cho: ${info.email_benh_nhan} (LK#${info.id})`);
            } catch (emailErr) {
                console.error(`❌ Lỗi gửi email hủy tự động cho LK#${info.id}:`, emailErr.message);
            }
        }
    } catch (err) {
        console.error('Lỗi auto cancel lịch khám:', err);
    }
};

// Lấy TẤT CẢ lịch hẹn cho Admin
const getAllAppointments = async (req, res) => {
    try {
        const pool = await connectDB();
        await autoCancelExpiredAppointments(pool); // Tự động dọn dẹp các lịch quá hạn
        const result = await pool.request().query(`
            SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, CONVERT(varchar, lk.ngay_tao, 126) as ngay_tao, lk.gio_kham,
                   CONVERT(varchar, llv.ngay_lam_viec, 126) as ngay_lam_viec, llv.khung_gio,
                   ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_benh_nhan, 
                   ISNULL(nd.so_dien_thoai, 'Chưa cập nhật') as so_dien_thoai,
                   ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si,
                   STT_Table.so_thu_tu,
                   lk.benh_nhan_id
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
        await autoCancelExpiredAppointments(pool); // Tự động dọn dẹp các lịch quá hạn
        const result = await pool.request()
            .input('benh_nhan_id', sql.Int, id)
            .query(`
                SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, CONVERT(varchar, lk.ngay_tao, 126) as ngay_tao, lk.gio_kham,
                       CONVERT(varchar, llv.ngay_lam_viec, 126) as ngay_lam_viec, llv.khung_gio,
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
        await autoCancelExpiredAppointments(pool); // Tự động dọn dẹp các lịch quá hạn
        const result = await pool.request()
            .input('bac_si_id', sql.Int, id)
            .query(`
                SELECT lk.id, lk.mo_ta_trieu_chung, lk.trang_thai, lk.ghi_chu_cua_bac_si, CONVERT(varchar, lk.ngay_tao, 126) as ngay_tao, lk.gio_kham,
                       CONVERT(varchar, llv.ngay_lam_viec, 126) as ngay_lam_viec, llv.khung_gio,
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
                VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, 'Pending', DATEADD(hour, 7, GETUTCDATE()))
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
        // GIỜ KHÁM LƯU TRONG DB LÀ GIỜ VIỆT NAM (UTC+7)
        // Server Render chạy UTC -> phải chuyển "now" sang giờ VN để so sánh chính xác
        const d = new Date(rowInfo.ngay_lam_viec);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const date = d.getUTCDate();
        
        const gioKhamStr = rowInfo.gio_kham ? rowInfo.gio_kham.split(' - ')[0] : '00:00';
        const [gio, phut] = gioKhamStr.split(':');
        
        // Tạo timestamp UTC cho giờ khám (VD: 14:00 VN = 07:00 UTC)
        const appointmentUTC = Date.UTC(year, month, date, parseInt(gio) - 7, parseInt(phut), 0);
        
        const now = Date.now(); // UTC timestamp
        const diffInMinutes = (appointmentUTC - now) / (1000 * 60);

        if (diffInMinutes > 30) {
            return res.status(400).json({ message: 'Chưa đến thời gian cho phép hủy lịch! Admin chỉ có quyền hủy lịch nếu bệnh nhân không đến khi còn cách giờ khám dưới 30 phút.' });
        }

        // KIỂM TRA LOGIC THANH TOÁN
        let isPaidOnline = false;
        const paymentCheck = await pool.request().input('id', sql.Int, id).query('SELECT phuong_thuc_thanh_toan, trang_thai_thanh_toan FROM ThanhToan WHERE lich_kham_id = @id');
        if (paymentCheck.recordset.length > 0) {
            const payment = paymentCheck.recordset[0];
            // Nếu đã thanh toán Online thành công -> Đánh dấu để hiển thị nhắc nhở hoàn tiền, không chặn hủy
            if ((payment.phuong_thuc_thanh_toan === 'transfer' || payment.phuong_thuc_thanh_toan === 'momo') && payment.trang_thai_thanh_toan === 1) {
                isPaidOnline = true;
            }
        }

        if (trang_thai.trim().toLowerCase() !== 'cancelled') {
            await pool.request().input('lich_lam_viec_id', sql.Int, lich_lam_viec_id).query('UPDATE LichLamViec SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END WHERE id = @lich_lam_viec_id');
        }

        // Thực hiện Xóa mềm (Soft Delete) - Cập nhật trạng thái thành Cancelled
        await pool.request().input('id', sql.Int, id).query("UPDATE LichKham SET trang_thai = 'Cancelled' WHERE id = @id");

        if (isPaidOnline) {
            res.json({ message: 'Hủy thành công. Vui lòng yêu cầu bệnh nhân đến quầy đối soát giao dịch để hoàn tiền!' });
        } else {
            res.json({ message: 'Hủy lịch hẹn thành công!' });
        }
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
            // 1. Tìm TẤT CẢ ca làm việc tương ứng với bác sĩ và ngày
            const shiftQuery = await new sql.Request(transaction)
                .input('bac_si_id', sql.Int, bac_si_id)
                .input('ngay_lam_viec', sql.Date, ngay_lam_viec)
                .query(`
                    SELECT llv.id, llv.khung_gio, hsbs.phi_kham, ISNULL(hsnd.ho_ten, tk.ten_dang_nhap) as ten_bac_si
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

            // FIX: Tìm đúng ca làm việc chứa khung giờ bệnh nhân đã chọn
            // (thay vì luôn lấy recordset[0] khi có nhiều ca trong cùng 1 ngày)
            const selectedStart = khung_gio.split(' - ')[0]; // VD: "09:00"
            let matchedShift = shiftQuery.recordset.find(shift => {
                const [shiftStart, shiftEnd] = shift.khung_gio.split(' - ');
                return selectedStart >= shiftStart && selectedStart < shiftEnd;
            });
            if (!matchedShift) matchedShift = shiftQuery.recordset[0]; // Fallback

            const lich_lam_viec_id = matchedShift.id;
            const phi_kham = matchedShift.phi_kham || 0;
            const ten_bac_si = matchedShift.ten_bac_si;
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
                    VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, @trang_thai, DATEADD(hour, 7, GETUTCDATE()), @gio_kham);
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
                    VALUES (@lich_kham_id, @so_tien, @phuong_thuc, @trang_thai_tt, DATEADD(hour, 7, GETUTCDATE()));
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
            .query(`INSERT INTO DanhGia (lich_kham_id, benh_nhan_id, bac_si_id, so_sao, noi_dung, ngay_danh_gia) VALUES (@lich_kham_id, @benh_nhan_id, @bac_si_id, @so_sao, @noi_dung, DATEADD(hour, 7, GETUTCDATE()))`);

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
                            UPDATE ThanhToan SET trang_thai_thanh_toan = 1, ngay_thanh_toan = DATEADD(hour, 7, GETUTCDATE()) WHERE lich_kham_id = @lich_kham_id;
                            UPDATE LichKham SET trang_thai = 'Approved' WHERE id = @lich_kham_id;
                            DECLARE @lich_lam_viec_id INT;
                            SELECT @lich_lam_viec_id = lich_lam_viec_id FROM LichKham WHERE id = @lich_kham_id;
                            UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id;
                        `);

                        // Hỗ trợ khám tổng quát: Nếu lịch này thuộc nhóm, cập nhật slot cho các lịch con khác
                        const groupCheck = await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
                            SELECT ma_nhom_kham FROM LichKham WHERE id = @lich_kham_id AND ma_nhom_kham IS NOT NULL
                        `);
                        if (groupCheck.recordset.length > 0 && groupCheck.recordset[0].ma_nhom_kham) {
                            await pool.request()
                                .input('ma_nhom', sql.VarChar, groupCheck.recordset[0].ma_nhom_kham)
                                .input('lich_kham_id', sql.Int, appointmentId)
                                .query(`
                                    UPDATE llv SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1
                                    FROM LichLamViec llv
                                    JOIN LichKham lk ON llv.id = lk.lich_lam_viec_id
                                    WHERE lk.ma_nhom_kham = @ma_nhom AND lk.id != @lich_kham_id
                                `);
                        }

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
                    UPDATE ThanhToan SET trang_thai_thanh_toan = 1, ngay_thanh_toan = DATEADD(hour, 7, GETUTCDATE()) WHERE lich_kham_id = @lich_kham_id;
                    UPDATE LichKham SET trang_thai = 'Approved' WHERE id = @lich_kham_id;
                    DECLARE @lich_lam_viec_id INT;
                    SELECT @lich_lam_viec_id = lich_lam_viec_id FROM LichKham WHERE id = @lich_kham_id;
                    UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id;
                `);

                // Hỗ trợ khám tổng quát: Nếu lịch này thuộc nhóm, cập nhật slot cho các lịch con khác
                const groupCheckPayOS = await pool.request().input('lich_kham_id', sql.Int, appointmentId).query(`
                    SELECT ma_nhom_kham FROM LichKham WHERE id = @lich_kham_id AND ma_nhom_kham IS NOT NULL
                `);
                if (groupCheckPayOS.recordset.length > 0 && groupCheckPayOS.recordset[0].ma_nhom_kham) {
                    await pool.request()
                        .input('ma_nhom', sql.VarChar, groupCheckPayOS.recordset[0].ma_nhom_kham)
                        .input('lich_kham_id', sql.Int, appointmentId)
                        .query(`
                            UPDATE llv SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1
                            FROM LichLamViec llv
                            JOIN LichKham lk ON llv.id = lk.lich_lam_viec_id
                            WHERE lk.ma_nhom_kham = @ma_nhom AND lk.id != @lich_kham_id
                        `);
                }

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
            // Kiểm tra nếu thuộc nhóm khám tổng quát → xóa cả nhóm
            const groupCheck = await pool.request().input('id', sql.Int, id).query(`
                SELECT ma_nhom_kham FROM LichKham WHERE id = @id AND ma_nhom_kham IS NOT NULL
            `);
            if (groupCheck.recordset.length > 0 && groupCheck.recordset[0].ma_nhom_kham) {
                const ma_nhom = groupCheck.recordset[0].ma_nhom_kham;
                await pool.request().input('ma_nhom', sql.VarChar, ma_nhom).input('id', sql.Int, id).query(`
                    DELETE FROM ThanhToan WHERE lich_kham_id = @id;
                    DELETE FROM LichKham WHERE ma_nhom_kham = @ma_nhom;
                `);
            } else {
                await pool.request().input('id', sql.Int, id).query(`
                    DELETE FROM ThanhToan WHERE lich_kham_id = @id;
                    DELETE FROM LichKham WHERE id = @id;
                `);
            }
            res.json({ message: 'Đã xóa lịch hẹn chưa thanh toán' });
        } else {
            res.status(400).json({ message: 'Không thể xóa lịch hẹn này' });
        }
    } catch (err) {
        console.error('Lỗi khi xóa lịch chưa thanh toán:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// =========================================================================
// API: BỆNH NHÂN TỰ HỦY LỊCH HẸN
// =========================================================================
const patientCancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { benh_nhan_id, acceptLoseFee } = req.body;

        if (!benh_nhan_id) {
            return res.status(400).json({ message: 'Thiếu thông tin bệnh nhân!' });
        }

        const pool = await connectDB();

        // 1. Lấy thông tin lịch hẹn + kiểm tra quyền sở hữu
        const appInfo = await pool.request().input('id', sql.Int, id).query(`
            SELECT lk.id, lk.lich_lam_viec_id, lk.trang_thai, lk.benh_nhan_id,
                   llv.ngay_lam_viec, lk.gio_kham,
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

        if (appInfo.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });
        }

        const rowInfo = appInfo.recordset[0];

        // Kiểm tra quyền: Bệnh nhân chỉ được hủy lịch của chính mình
        if (rowInfo.benh_nhan_id !== benh_nhan_id) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy lịch hẹn này!' });
        }

        const status = rowInfo.trang_thai.trim().toLowerCase();

        // Không cho hủy lịch đã khám xong
        if (status === 'done') {
            return res.status(400).json({ message: 'Không thể hủy lịch đã khám xong!' });
        }

        // Không cho hủy lịch đã bị hủy rồi
        if (status === 'cancelled') {
            return res.status(400).json({ message: 'Lịch hẹn này đã bị hủy trước đó!' });
        }

        // 2. Kiểm tra trạng thái thanh toán
        const paymentCheck = await pool.request().input('id', sql.Int, id).query(`
            SELECT phuong_thuc_thanh_toan, trang_thai_thanh_toan, so_tien 
            FROM ThanhToan WHERE lich_kham_id = @id
        `);

        let isPaidOnline = false;
        let soTien = 0;

        if (paymentCheck.recordset.length > 0) {
            const payment = paymentCheck.recordset[0];
            soTien = payment.so_tien || 0;
            // Đã thanh toán online (transfer/momo) và tiền đã chuyển thành công
            if ((payment.phuong_thuc_thanh_toan === 'transfer' || payment.phuong_thuc_thanh_toan === 'momo') 
                && payment.trang_thai_thanh_toan === 1) {
                isPaidOnline = true;
            }
        }

        // 3. Nếu đã thanh toán online → Yêu cầu xác nhận mất phí
        if (isPaidOnline && !acceptLoseFee) {
            return res.status(200).json({ 
                requireConfirm: true, 
                message: `Lịch hẹn này đã được thanh toán online ${Number(soTien).toLocaleString('en-US')} VNĐ. Nếu hủy, bạn sẽ mất phí khám. Bạn có đồng ý?`,
                soTien: soTien
            });
        }

        // 4. Thực hiện hủy lịch
        // Hoàn lại slot cho ca làm việc
        await pool.request()
            .input('lich_lam_viec_id', sql.Int, rowInfo.lich_lam_viec_id)
            .query('UPDATE LichLamViec SET so_luong_hien_tai = CASE WHEN so_luong_hien_tai > 0 THEN so_luong_hien_tai - 1 ELSE 0 END WHERE id = @lich_lam_viec_id');

        // Cập nhật trạng thái lịch khám thành Cancelled
        const lyDoHuy = isPaidOnline 
            ? 'Bệnh nhân tự hủy lịch (đã chấp nhận mất phí khám)' 
            : 'Bệnh nhân tự hủy lịch';

        await pool.request()
            .input('id', sql.Int, id)
            .input('ghi_chu', sql.NVarChar, lyDoHuy)
            .query("UPDATE LichKham SET trang_thai = 'Cancelled', ghi_chu_cua_bac_si = @ghi_chu WHERE id = @id");

        // 5. Gửi email xác nhận hủy cho bệnh nhân
        if (rowInfo.email_benh_nhan) {
            const d = new Date(rowInfo.ngay_lam_viec);
            const ngay_kham_str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            const cancelHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <div style="background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2>Xác Nhận Hủy Lịch Khám</h2>
                    </div>
                    <div style="padding: 20px; line-height: 1.6; color: #334155;">
                        <p>Xin chào <strong>${rowInfo.ten_benh_nhan}</strong>,</p>
                        <p>Bạn đã thực hiện <strong style="color: #EF4444;">HỦY</strong> lịch khám thành công trên hệ thống. Dưới đây là thông tin lịch khám đã hủy:</p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Mã lịch khám:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">#${rowInfo.id}</td></tr>
                            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Bác sĩ phụ trách:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">BS. ${rowInfo.ten_bac_si}</td></tr>
                            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Ngày hẹn:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0284C7; font-weight: bold;">${ngay_kham_str}</td></tr>
                            <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Giờ hẹn:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #10B981; font-weight: bold;">${rowInfo.gio_kham || 'Chưa cập nhật'}</td></tr>
                        </table>
                        <p style="margin-top: 20px;">Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ với chúng tôi.</p>
                        <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
                    </div>
                </div>
            `;

            sendEmailBrevo(
                rowInfo.email_benh_nhan,
                `[TT Medical] Xác nhận HỦY lịch khám - Lịch khám #${rowInfo.id}`,
                cancelHtml
            );
        }

        res.json({ message: 'Hủy lịch hẹn thành công!' });

    } catch (error) {
        console.error('Lỗi bệnh nhân hủy lịch:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// =========================================================================
// KHÁM TỔNG QUÁT: Helper tạo time slots (giống frontend)
// =========================================================================
function generateTimeSlotsHelper(startStr, endStr) {
    const slots = [];
    let [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    while (true) {
        let nextM = startM + 30;
        let nextH = startH;
        if (nextM >= 60) { nextM -= 60; nextH++; }
        if (nextH > endH || (nextH === endH && nextM > endM)) break;
        slots.push(`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
        startH = nextH;
        startM = nextM;
    }
    return slots;
}

// =========================================================================
// KHÁM TỔNG QUÁT: PREVIEW — Xem trước phân bổ bác sĩ tự động
// =========================================================================
const previewGeneralCheckup = async (req, res) => {
    try {
        const { ngay_kham } = req.body;
        if (!ngay_kham) return res.status(400).json({ message: 'Vui lòng chọn ngày khám!' });
        const pool = await connectDB();

        // 1. Lấy danh sách chuyên khoa tham gia tổng quát
        const specResult = await pool.request().query(`
            SELECT id, ten_chuyen_khoa FROM ChuyenKhoa WHERE tham_gia_tong_quat = 1 ORDER BY id ASC
        `);
        const specialties = specResult.recordset;
        if (specialties.length === 0) {
            return res.status(400).json({ message: 'Chưa có chuyên khoa nào được cấu hình khám tổng quát! Admin cần bật cột tham_gia_tong_quat.' });
        }

        // 2. Lấy TẤT CẢ bác sĩ có ca làm việc còn trống ngày đó (gộp thông tin)
        const dataResult = await pool.request()
            .input('ngay_kham', sql.Date, ngay_kham)
            .query(`
                SELECT 
                    ck.id as chuyen_khoa_id, ck.ten_chuyen_khoa,
                    bs.tai_khoan_id as bac_si_id, 
                    ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_bac_si,
                    nd.anh_dai_dien,
                    bs.phi_kham,
                    llv.id as lich_lam_viec_id, llv.khung_gio, 
                    llv.so_luong_toi_da, llv.so_luong_hien_tai
                FROM ChuyenKhoa ck
                JOIN HoSoBacSi bs ON bs.chuyen_khoa_id = ck.id
                JOIN TaiKhoan tk ON bs.tai_khoan_id = tk.id
                LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
                JOIN LichLamViec llv ON llv.bac_si_id = bs.tai_khoan_id
                WHERE ck.tham_gia_tong_quat = 1
                AND CAST(llv.ngay_lam_viec AS DATE) = CAST(@ngay_kham AS DATE)
                AND ISNULL(llv.trang_thai, 'Active') = 'Active'
                AND llv.so_luong_hien_tai < llv.so_luong_toi_da
                AND tk.trang_thai = 1
                ORDER BY ck.id, llv.so_luong_hien_tai ASC
            `);

        // 3. Lấy tất cả slot đã đặt trong ngày
        const bookedResult = await pool.request()
            .input('ngay_kham', sql.Date, ngay_kham)
            .query(`
                SELECT llv.bac_si_id, lk.gio_kham
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                LEFT JOIN ThanhToan tt ON lk.id = tt.lich_kham_id
                WHERE CAST(llv.ngay_lam_viec AS DATE) = CAST(@ngay_kham AS DATE)
                AND lk.trang_thai != 'Cancelled'
                AND lk.gio_kham IS NOT NULL
                AND (tt.phuong_thuc_thanh_toan = 'cash' OR tt.trang_thai_thanh_toan = 1 OR tt.id IS NULL)
            `);

        // Build booked map: bac_si_id -> { slot -> count }
        const bookedMap = {};
        for (const row of bookedResult.recordset) {
            if (!bookedMap[row.bac_si_id]) bookedMap[row.bac_si_id] = {};
            if (!bookedMap[row.bac_si_id][row.gio_kham]) bookedMap[row.bac_si_id][row.gio_kham] = 0;
            bookedMap[row.bac_si_id][row.gio_kham]++;
        }

        // 4. Build availability: chuyên khoa -> { slot -> [doctors] }
        const availability = {};
        for (const row of dataResult.recordset) {
            const specId = row.chuyen_khoa_id;
            if (!availability[specId]) {
                availability[specId] = { ten_chuyen_khoa: row.ten_chuyen_khoa, slots: {} };
            }
            const [shiftStart, shiftEnd] = row.khung_gio.split(' - ');
            const slotsOfShift = generateTimeSlotsHelper(shiftStart, shiftEnd);
            
            // Tính số lượng tối đa cho mỗi khung giờ (slot) giống như luồng đặt lịch thường
            const maxPerSlot = Math.ceil(row.so_luong_toi_da / Math.max(1, slotsOfShift.length));
            const docBookedCounts = bookedMap[row.bac_si_id] || {};

            for (const slot of slotsOfShift) {
                const countBookedInSlot = docBookedCounts[slot] || 0;
                
                // Chỉ loại bỏ slot nếu số người đặt đã đạt giới hạn maxPerSlot
                if (countBookedInSlot < maxPerSlot) {
                    if (!availability[specId].slots[slot]) availability[specId].slots[slot] = [];
                    // Tránh trùng bác sĩ (nếu có nhiều ca trong ngày)
                    if (!availability[specId].slots[slot].find(d => d.bac_si_id === row.bac_si_id)) {
                        availability[specId].slots[slot].push({
                            bac_si_id: row.bac_si_id,
                            ten_bac_si: row.ten_bac_si,
                            anh_dai_dien: row.anh_dai_dien,
                            phi_kham: row.phi_kham || 0,
                            lich_lam_viec_id: row.lich_lam_viec_id,
                            so_luong_hien_tai: row.so_luong_hien_tai
                        });
                    }
                }
            }
        }

        // 5. Thu thập tất cả slot times, sắp xếp
        const allSlotTimes = new Set();
        for (const specId in availability) {
            for (const slot in availability[specId].slots) allSlotTimes.add(slot);
        }
        const sortedSlots = [...allSlotTimes].sort();

        // Lọc bỏ slot đã qua (nếu đặt cho ngày hôm nay)
        const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const todayStrVN = nowVN.toISOString().split('T')[0];
        const currentTimeVN = nowVN.toISOString().split('T')[1].substring(0, 5);
        const isToday = ngay_kham === todayStrVN;

        const filteredSlots = isToday
            ? sortedSlots.filter(s => s.split(' - ')[0] > currentTimeVN)
            : sortedSlots;

        // 6. Tìm chuỗi slot liên tiếp (mỗi chuyên khoa 1 slot, liền nhau 30 phút)
        const specIds = specialties.map(s => s.id);
        let result = null;

        for (let i = 0; i < filteredSlots.length; i++) {
            let allocation = [];
            let currentSlot = filteredSlots[i];
            let valid = true;
            const usedDoctors = new Set();

            for (let j = 0; j < specIds.length; j++) {
                const specId = specIds[j];
                const specSlots = availability[specId]?.slots[currentSlot];

                if (!specSlots || specSlots.length === 0) { valid = false; break; }

                // Chọn bác sĩ ít bệnh nhân nhất và chưa được chọn
                const candidates = specSlots
                    .filter(d => !usedDoctors.has(d.bac_si_id))
                    .sort((a, b) => a.so_luong_hien_tai - b.so_luong_hien_tai);

                if (candidates.length === 0) { valid = false; break; }

                const selected = candidates[0];
                usedDoctors.add(selected.bac_si_id);

                allocation.push({
                    thu_tu: j + 1,
                    chuyen_khoa_id: specId,
                    ten_chuyen_khoa: availability[specId].ten_chuyen_khoa,
                    bac_si_id: selected.bac_si_id,
                    ten_bac_si: selected.ten_bac_si,
                    anh_dai_dien: selected.anh_dai_dien,
                    phi_kham: selected.phi_kham,
                    gio_kham: currentSlot,
                    lich_lam_viec_id: selected.lich_lam_viec_id
                });

                // Tính slot tiếp theo (+30 phút)
                const nextStart = currentSlot.split(' - ')[1]; // "08:00 - 08:30" -> "08:30"
                const [nh, nm] = nextStart.split(':').map(Number);
                let enm = nm + 30, enh = nh;
                if (enm >= 60) { enm -= 60; enh++; }
                currentSlot = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')} - ${String(enh).padStart(2, '0')}:${String(enm).padStart(2, '0')}`;
            }

            if (valid) { result = allocation; break; }
        }

        if (!result) {
            // Kiểm tra chi tiết: chuyên khoa nào không có bác sĩ?
            const missingSpecs = specialties.filter(s => !availability[s.id] || Object.keys(availability[s.id].slots).length === 0);
            const missingNames = missingSpecs.map(s => s.ten_chuyen_khoa).join(', ');
            return res.status(400).json({
                message: missingNames
                    ? `Không tìm được bác sĩ cho chuyên khoa: ${missingNames}. Vui lòng chọn ngày khác!`
                    : 'Không tìm được lịch khám tổng quát liên tiếp cho ngày này. Vui lòng chọn ngày khác!'
            });
        }

        const tongPhi = result.reduce((sum, item) => sum + (parseFloat(item.phi_kham) || 0), 0);
        res.json({ ngay_kham, phan_bo: result, tong_phi: tongPhi, so_chuyen_khoa: result.length });

    } catch (error) {
        console.error('Lỗi preview khám tổng quát:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// =========================================================================
// KHÁM TỔNG QUÁT: TẠO LỊCH KHÁM TỔNG QUÁT (Transaction)
// =========================================================================
const createGeneralCheckup = async (req, res) => {
    try {
        const { benh_nhan_id, ngay_kham, phan_bo, phuong_thuc_thanh_toan, ho_ten, email, mo_ta_trieu_chung } = req.body;
        if (!benh_nhan_id || !ngay_kham || !phan_bo || phan_bo.length === 0) {
            return res.status(400).json({ message: 'Thiếu thông tin đặt khám tổng quát!' });
        }

        const pool = await connectDB();
        const ptttoan = phuong_thuc_thanh_toan || 'cash';

        // Tạo mã nhóm khám
        const dateStr = ngay_kham.replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const ma_nhom_kham = `TQ-${dateStr}-${random}`;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            let firstAppointmentId = null;
            let tongPhi = 0;
            const lichTrinhChiTiet = [];

            for (let i = 0; i < phan_bo.length; i++) {
                const item = phan_bo[i];
                const phiKham = parseFloat(item.phi_kham) || 0;
                tongPhi += phiKham;

                // Kiểm tra ca còn trống
                const shiftCheck = await new sql.Request(transaction)
                    .input('lich_lam_viec_id', sql.Int, item.lich_lam_viec_id)
                    .query(`SELECT so_luong_toi_da, so_luong_hien_tai FROM LichLamViec WHERE id = @lich_lam_viec_id`);

                if (shiftCheck.recordset.length === 0 ||
                    shiftCheck.recordset[0].so_luong_hien_tai >= shiftCheck.recordset[0].so_luong_toi_da) {
                    await transaction.rollback();
                    return res.status(400).json({ message: `Ca của BS. ${item.ten_bac_si} (${item.ten_chuyen_khoa}) đã hết chỗ! Vui lòng tìm lại lịch.` });
                }

                // Mô tả triệu chứng kèm context khám tổng quát
                const moTa = mo_ta_trieu_chung
                    ? `[Khám tổng quát - ${item.ten_chuyen_khoa}] ${mo_ta_trieu_chung}`
                    : `[Khám tổng quát - ${item.ten_chuyen_khoa}] Bước ${item.thu_tu}/${phan_bo.length}`;

                // Tạo LichKham
                const result = await new sql.Request(transaction)
                    .input('lich_lam_viec_id', sql.Int, item.lich_lam_viec_id)
                    .input('benh_nhan_id', sql.Int, benh_nhan_id)
                    .input('gio_kham', sql.VarChar, item.gio_kham)
                    .input('mo_ta_trieu_chung', sql.NVarChar, moTa)
                    .input('trang_thai', sql.VarChar, 'Approved')
                    .input('ma_nhom_kham', sql.VarChar, ma_nhom_kham)
                    .query(`
                        INSERT INTO LichKham (lich_lam_viec_id, benh_nhan_id, mo_ta_trieu_chung, trang_thai, ngay_tao, gio_kham, ma_nhom_kham)
                        OUTPUT inserted.id
                        VALUES (@lich_lam_viec_id, @benh_nhan_id, @mo_ta_trieu_chung, @trang_thai, DATEADD(hour, 7, GETUTCDATE()), @gio_kham, @ma_nhom_kham)
                    `);

                const appointmentId = result.recordset[0].id;
                if (i === 0) firstAppointmentId = appointmentId;

                lichTrinhChiTiet.push({ id: appointmentId, ...item });

                // Tiền mặt: Tăng slot ngay lập tức
                if (ptttoan === 'cash') {
                    await new sql.Request(transaction)
                        .input('lich_lam_viec_id', sql.Int, item.lich_lam_viec_id)
                        .query(`UPDATE LichLamViec SET so_luong_hien_tai = ISNULL(so_luong_hien_tai, 0) + 1 WHERE id = @lich_lam_viec_id`);
                }
            }

            // Tạo 1 ThanhToan cho lịch đầu tiên với TỔNG PHÍ
            await new sql.Request(transaction)
                .input('lich_kham_id', sql.Int, firstAppointmentId)
                .input('so_tien', sql.Decimal(18, 2), tongPhi)
                .input('phuong_thuc', sql.VarChar(50), ptttoan)
                .input('trang_thai_tt', sql.Int, 0)
                .query(`
                    INSERT INTO ThanhToan (lich_kham_id, so_tien, phuong_thuc_thanh_toan, trang_thai_thanh_toan, ngay_tao)
                    VALUES (@lich_kham_id, @so_tien, @phuong_thuc, @trang_thai_tt, DATEADD(hour, 7, GETUTCDATE()))
                `);

            // Xử lý PayOS QR cho Momo (tái sử dụng logic hiện tại)
            let payosQrCode = null;
            if (ptttoan === 'momo') {
                const crypto = require('crypto');
                const clientId = process.env.PAYOS_CLIENT_ID;
                const apiKey = process.env.PAYOS_API_KEY;
                const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
                const orderCode = firstAppointmentId;
                const amount = parseInt(tongPhi) < 2000 ? 2000 : parseInt(tongPhi);
                const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9 ]/g, '');
                const patientNameNoAccent = removeAccents(ho_ten || '').toUpperCase();
                let description = `TTMED ${firstAppointmentId} TQ ${patientNameNoAccent}`;
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
                    return res.status(400).json({ message: 'Lỗi tạo QR thanh toán: ' + payosData.desc });
                }
            }

            await transaction.commit();

            // Gửi email xác nhận cho khám tổng quát
            if (ptttoan === 'cash' && email) {
                const dateObj = new Date(ngay_kham);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                const tongTienStr = Number(tongPhi).toLocaleString('en-US');

                let lichTrinhHtml = lichTrinhChiTiet.map(item => `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0284C7;">${item.gio_kham}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">BS. ${item.ten_bac_si}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.ten_chuyen_khoa}</td>
                    </tr>
                `).join('');

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="background: linear-gradient(135deg, #0284C7, #10b981); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h2>Xác Nhận Khám Tổng Quát</h2>
                        </div>
                        <div style="padding: 20px; line-height: 1.6; color: #334155;">
                            <p>Xin chào <strong>${ho_ten}</strong>,</p>
                            <p>Lịch khám tổng quát của bạn đã được ghi nhận. Dưới đây là lịch trình chi tiết:</p>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 10px; text-align: left;">Giờ khám</th>
                                    <th style="padding: 10px; text-align: left;">Bác sĩ</th>
                                    <th style="padding: 10px; text-align: left;">Chuyên khoa</th>
                                </tr>
                                ${lichTrinhHtml}
                            </table>
                            <p style="margin-top: 15px;"><strong>Ngày khám:</strong> <span style="color: #0284C7; font-weight: bold;">${formattedDate}</span></p>
                            <p><strong>Tổng phí:</strong> <span style="color: #0284C7; font-weight: bold;">${tongTienStr} VND</span></p>
                            <p><strong>Trạng thái:</strong> <span style="color: #F59E0B;">Chưa thanh toán (Thu tại quầy)</span></p>
                            <p style="margin-top: 20px;">Vui lòng có mặt trước 15 phút tại bệnh viện để làm thủ tục check-in.</p>
                            <p>Trân trọng,<br><strong>Bệnh viện TT Medical</strong></p>
                        </div>
                    </div>
                `;
                sendEmailBrevo(email, `[TT Medical] Xác nhận Khám Tổng Quát - Mã nhóm ${ma_nhom_kham}`, htmlContent);
            }

            res.status(201).json({
                message: 'Đặt lịch khám tổng quát thành công!',
                appointmentId: firstAppointmentId,
                ma_nhom_kham,
                phi_kham: tongPhi,
                payosQrCode,
                so_lich: phan_bo.length
            });

        } catch (transErr) {
            await transaction.rollback();
            console.error('Lỗi Transaction khám tổng quát:', transErr);
            return res.status(500).json({ message: 'Lỗi lưu dữ liệu. Đã hủy bỏ giao dịch!' });
        }
    } catch (error) {
        console.error('Lỗi tạo lịch khám tổng quát:', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

module.exports = { getAllAppointments, getAppointmentsByDoctor, getAppointmentsByPatient, updateAppointmentStatus, updateAppointmentNote, deleteAppointment, createAppointment1, createAppointment, getBookedSlots, rateAppointment, cassoWebhook, payosWebhook, checkPaymentStatus, deleteUnpaidAppointment, patientCancelAppointment, previewGeneralCheckup, createGeneralCheckup };