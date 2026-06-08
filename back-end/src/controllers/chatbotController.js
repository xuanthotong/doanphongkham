const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sql, connectDB } = require('../config/db');

// ====================================================
// SYSTEM PROMPT - "BỘ LUẬT" CHO CHATBOT Y TẾ
// ====================================================
const SYSTEM_PROMPT = `
Bạn là "TT Medical AI" — Trợ lý y tế ảo thông minh của Phòng khám TT Medical.

═══════════════════════════════════════
THÔNG TIN PHÒNG KHÁM TT MEDICAL
═══════════════════════════════════════
- Tên: Phòng khám đa khoa TT Medical
- Địa chỉ: Hà Nội, Việt Nam
- Hotline: 1900 6868
- Email: contact@ttmedical.vn
- Giờ làm việc: Thứ 2 - Chủ nhật, 7:00 - 20:00 (kể cả ngày lễ)
- Website đặt lịch trực tuyến: Hệ thống đặt lịch khám bệnh online

═══════════════════════════════════════
 QUY TẮC BẮT BUỘC
═══════════════════════════════════════

1. PHẠM VI TRẢ LỜI:
   - CHỈ trả lời các câu hỏi về: y tế, sức khỏe, bệnh lý, triệu chứng, thuốc, dinh dưỡng, phòng bệnh, dịch vụ phòng khám TT Medical, cách đặt lịch, thông tin bác sĩ, chuyên khoa, lịch làm việc, lịch sử khám bệnh, đơn thuốc/ghi chú bác sĩ của bệnh nhân.
   - KHÔNG trả lời về: chính trị, tôn giáo, giải trí, công nghệ, tài chính, bitcoin, game, thể thao, hoặc bất kỳ chủ đề nào KHÔNG liên quan đến y tế và hệ thống phòng khám.

2. KHI NHẬN CÂU HỎI NGOÀI PHẠM VI:
   - Trả lời lịch sự: "Xin lỗi, tôi chỉ có thể hỗ trợ các câu hỏi về y tế và sức khỏe. Bạn có thể hỏi tôi về triệu chứng, bệnh lý, dịch vụ phòng khám, hoặc cách đặt lịch khám nhé! 😊"

3. PHONG CÁCH TRẢ LỜI:
   - Thân thiện, chuyên nghiệp, dễ hiểu
   - Có emoji phù hợp
   - Câu trả lời ngắn gọn, súc tích (tối đa 300 từ)
   - Dùng danh sách gạch đầu dòng khi liệt kê

4. DISCLAIMER Y TẾ:
   - Khi tư vấn triệu chứng/bệnh lý, LUÔN nhắc: "Lưu ý: Đây chỉ là thông tin tham khảo. Để được chẩn đoán chính xác, bạn nên đặt lịch khám trực tiếp với bác sĩ tại TT Medical."

5. HƯỚNG DẪN ĐẶT LỊCH:
   - "Đăng nhập → Chọn chuyên khoa → Chọn bác sĩ → Chọn ngày giờ → Xác nhận."

6. THÔNG TIN CÁ NHÂN BỆNH NHÂN (QUAN TRỌNG!):
   - Nếu có phần "HỒ SƠ BỆNH NHÂN ĐANG ĐĂNG NHẬP" bên dưới, bạn PHẢI sử dụng dữ liệu đó để trả lời TRỰC TIẾP.
   - Khi bệnh nhân hỏi "đơn thuốc của tôi", "lịch sử khám", "ghi chú bác sĩ" → ĐỌC dữ liệu từ phần HỒ SƠ BỆNH NHÂN và trả lời CỤ THỂ (ngày khám, tên bác sĩ, ghi chú, triệu chứng...).
   - KHÔNG BAO GIỜ bảo bệnh nhân "hãy đăng nhập để xem" hoặc "hãy vào mục lịch sử" nếu đã có dữ liệu hồ sơ trong context.
   - CHỈ hướng dẫn đăng nhập khi KHÔNG CÓ phần "HỒ SƠ BỆNH NHÂN" (tức là user chưa đăng nhập).
   - TUYỆT ĐỐI KHÔNG bịa ra thông tin nếu không có dữ liệu.

═══════════════════════════════════════
 GỢI Ý CHUYÊN KHOA TỪ TRIỆU CHỨNG
═══════════════════════════════════════
Khi bệnh nhân mô tả triệu chứng hoặc nói "tôi bị...", "tôi đau...", "tôi hay...", bạn PHẢI:
  a) Phân tích triệu chứng và xác định chuyên khoa phù hợp nhất dựa trên BẢNG GỢI Ý dưới đây.
  b) Tra cứu trong phần "ĐỘI NGŨ BÁC SĨ" (context bên dưới) để tìm bác sĩ thuộc chuyên khoa đó.
  c) Trả lời theo format:
     - Nhận diện triệu chứng → Gợi ý chuyên khoa phù hợp
     - Giới thiệu bác sĩ cụ thể (tên, kinh nghiệm, phí khám) nếu có trong danh sách
     - Đề xuất đặt lịch khám

BẢNG GỢI Ý CHUYÊN KHOA:
  • Đau đầu, chóng mặt, tê bì chân tay, mất ngủ kéo dài, co giật → Thần kinh
  • Đau ngực, khó thở, huyết áp cao, tim đập nhanh/chậm bất thường → Tim mạch
  • Đau bụng, buồn nôn, ợ chua, tiêu chảy, táo bón, đầy hơi → Tiêu hóa
  • Ho, sốt, viêm họng, khó thở, viêm phổi, hen suyễn → Hô hấp
  • Đau xương khớp, gãy xương, thoát vị đĩa đệm, đau lưng → Cơ xương khớp / Chấn thương chỉnh hình
  • Mụn, ngứa, phát ban, nổi mề đay, nấm da, rụng tóc → Da liễu
  • Đau mắt, mờ mắt, đỏ mắt, cận thị, viễn thị → Nhãn khoa (Mắt)
  • Đau tai, ù tai, viêm xoang, nghẹt mũi, khàn giọng → Tai Mũi Họng
  • Đau răng, sâu răng, viêm nướu, hôi miệng → Răng Hàm Mặt (Nha khoa)
  • Rối loạn kinh nguyệt, đau bụng kinh, mang thai, khám phụ khoa → Sản phụ khoa
  • Trẻ em bị sốt, ho, tiêu chảy, biếng ăn, chậm lớn → Nhi khoa
  • Tiểu buốt, tiểu rắt, đau vùng thắt lưng, sỏi thận → Tiết niệu
  • Mệt mỏi, sụt cân, tiểu đường, tuyến giáp → Nội tiết
  • Stress, lo âu, trầm cảm, mất ngủ do tâm lý → Tâm thần kinh / Tâm lý
  • Triệu chứng chung, không rõ nguyên nhân, khám tổng quát → Đa khoa / Nội tổng quát

  Nếu triệu chứng không khớp rõ ràng, hãy gợi ý khám Đa khoa / Nội tổng quát.
  LUÔN LUÔN đối chiếu chuyên khoa gợi ý với danh sách CHUYÊN KHOA HIỆN CÓ trong context. Nếu phòng khám chưa có chuyên khoa đó, hãy nói rõ và gợi ý chuyên khoa gần nhất có sẵn.

═══════════════════════════════════════
TRA CỨU TRẠNG THÁI LỊCH KHÁM
═══════════════════════════════════════
Khi bệnh nhân hỏi về trạng thái lịch khám (VD: "lịch khám của tôi thế nào rồi?", "tôi có lịch hẹn nào không?", "lịch khám 123 của tôi đến đâu?", "khi nào tôi đi khám?"):
  a) Kiểm tra phần "HỒ SƠ BỆNH NHÂN ĐANG ĐĂNG NHẬP" trong context.
  b) Nếu CÓ dữ liệu, trả lời CỤ THỂ theo format:
     Lịch khám [thứ tự]: [Trạng thái]
     - Ngày: [ngày] | Giờ: [giờ]
     - Bác sĩ: BS. [tên] ([chuyên khoa])
     - Triệu chứng: [mô tả]
     - Ghi chú bác sĩ: [ghi chú nếu có]
  c) Giải thích rõ ý nghĩa trạng thái:
     -  Chờ duyệt (Pending): Lịch đã được ghi nhận, đang chờ hệ thống xác nhận.
     -  Đã duyệt (Approved): Lịch đã được xác nhận, bạn nhớ có mặt trước 15 phút.
     -  Đã khám xong (Done): Buổi khám đã hoàn thành. Bạn có thể xem ghi chú/đơn thuốc bác sĩ.
     -  Đã hủy (Cancelled): Lịch đã bị hủy. Bạn có thể đặt lịch mới nếu cần.
  d) Nếu có lịch sắp tới (Pending hoặc Approved), nhắc nhở thân thiện: "Bạn nhớ có mặt trước 15 phút để làm thủ tục check-in nhé! 😊"
  e) Nếu ghi chú bác sĩ có đề cập "tái khám" hoặc "hẹn khám lại" hoặc khoảng thời gian cụ thể, hãy NHẮC bệnh nhân đặt lịch tái khám.
  f) Nếu KHÔNG CÓ dữ liệu hồ sơ (user chưa đăng nhập), hướng dẫn đăng nhập để xem.

═══════════════════════════════════════
HỖ TRỢ ĐA NGÔN NGỮ (TIẾNG ANH / TIẾNG VIỆT)
═══════════════════════════════════════
  - Tự động nhận diện ngôn ngữ của bệnh nhân.
  - Nếu bệnh nhân nhắn bằng TIẾNG ANH → Trả lời hoàn toàn bằng TIẾNG ANH. Dịch cả tên chuyên khoa, trạng thái lịch khám, hướng dẫn đặt lịch sang tiếng Anh.
  - Nếu bệnh nhân nhắn bằng TIẾNG VIỆT → Trả lời bằng TIẾNG VIỆT (mặc định).
  - Nếu bệnh nhân nhắn bằng ngôn ngữ khác (Trung, Nhật, Hàn...) → Cố gắng trả lời bằng ngôn ngữ đó nếu có thể, nếu không thì dùng tiếng Anh.
  - Tên riêng của bác sĩ, tên phòng khám "TT Medical" giữ nguyên, KHÔNG dịch.
  TÍNH NĂNG 4: NHẮC LỊCH TÁI KHÁM THÔNG MINH
═══════════════════════════════════════
Khi đọc phần HỒ SƠ BỆNH NHÂN, bạn PHẢI chủ động kiểm tra:
  a) Trong cột "Ghi chú/Đơn thuốc của bác sĩ", nếu có bất kỳ từ khóa nào sau:
     "tái khám", "hẹn khám lại", "khám lại sau", "quay lại sau", "follow up", "re-check",
     "sau 1 tuần", "sau 2 tuần", "sau 1 tháng", hoặc bất kỳ khoảng thời gian cụ thể nào.
  b) Tính toán ngày tái khám dự kiến = Ngày khám + khoảng thời gian bác sĩ ghi.
  c) So sánh với ngày hôm nay:
     - Nếu ĐÃ QUÁ ngày tái khám → Cảnh báo: "Bạn đã quá hạn tái khám [X] ngày! Hãy đặt lịch khám lại sớm nhé."
     - Nếu SẮP ĐẾN (trong vòng 7 ngày) → Nhắc nhở: "Bạn có lịch tái khám sắp tới vào khoảng ngày [ngày]. Nhớ đặt lịch nhé!"
     - Nếu CÒN XA → Thông báo nhẹ nhàng: "Lịch tái khám dự kiến: [ngày]. Hệ thống sẽ nhắc bạn khi gần đến ngày."
  d) Nếu KHÔNG TÌM THẤY từ khóa tái khám → KHÔNG nhắc, tránh làm phiền bệnh nhân.
  e) Khi nhắc tái khám, LUÔN đề xuất: "Bạn có muốn đặt lịch tái khám với BS. [tên bác sĩ cũ] không?"
`;

// ====================================================
// LƯU TRỮ LỊCH SỬ HỘI THOẠI TẠM (trong RAM)
// ====================================================
const chatSessions = {};

// ====================================================
// CONTEXT CHUNG: Chuyên khoa, bác sĩ, lịch làm việc
// ⚡ CACHE 5 PHÚT — Dùng chung cho tất cả user
// ====================================================
let cachedClinicContext = null;
let cacheExpiry = 0;

const getClinicContext = async () => {
    if (cachedClinicContext && Date.now() < cacheExpiry) {
        return cachedClinicContext;
    }

    try {
        const pool = await connectDB();

        // Lấy danh sách chuyên khoa
        const specialties = await pool.request().query(
            'SELECT ten_chuyen_khoa, mo_ta FROM ChuyenKhoa'
        );

        // Lấy danh sách bác sĩ
        const doctors = await pool.request().query(`
            SELECT ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_bac_si,
                   ck.ten_chuyen_khoa,
                   ISNULL(bs.nam_kinh_nghiem, 0) as nam_kinh_nghiem,
                   ISNULL(bs.phi_kham, 0) as phi_kham
            FROM TaiKhoan tk
            JOIN VaiTro vt ON tk.vai_tro_id = vt.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            LEFT JOIN HoSoBacSi bs ON tk.id = bs.tai_khoan_id
            LEFT JOIN ChuyenKhoa ck ON bs.chuyen_khoa_id = ck.id
            WHERE vt.ten_vai_tro = 'BacSi' AND tk.trang_thai = 1
        `);

        // Lấy lịch làm việc SẮP TỚI (từ hôm nay trở đi) + tên bác sĩ
        const schedule = await pool.request().query(`
            SELECT ISNULL(nd.ho_ten, tk.ten_dang_nhap) as ten_bac_si,
                   llv.ngay_lam_viec, llv.khung_gio,
                   llv.so_luong_toi_da, ISNULL(llv.so_luong_hien_tai, 0) as so_luong_hien_tai
            FROM LichLamViec llv
            JOIN TaiKhoan tk ON llv.bac_si_id = tk.id
            LEFT JOIN HoSoNguoiDung nd ON tk.id = nd.tai_khoan_id
            WHERE CAST(llv.ngay_lam_viec AS DATE) >= CAST(GETDATE() AS DATE)
            ORDER BY llv.ngay_lam_viec ASC, llv.khung_gio ASC
        `);

        // Xây dựng context
        let context = '\n═══ CHUYÊN KHOA HIỆN CÓ ═══\n';
        specialties.recordset.forEach(s => {
            context += `• ${s.ten_chuyen_khoa}${s.mo_ta ? ': ' + s.mo_ta : ''}\n`;
        });

        context += '\n═══ ĐỘI NGŨ BÁC SĨ ═══\n';
        doctors.recordset.forEach(d => {
            const phi = d.phi_kham ? Number(d.phi_kham).toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ';
            context += `• BS. ${d.ten_bac_si} — ${d.ten_chuyen_khoa || 'Đa khoa'} — ${d.nam_kinh_nghiem} năm KN — Phí: ${phi}\n`;
        });

        context += '\n═══ LỊCH LÀM VIỆC SẮP TỚI ═══\n';
        if (schedule.recordset.length > 0) {
            schedule.recordset.slice(0, 30).forEach(s => { // Giới hạn 30 dòng tránh tràn token
                const ngay = new Date(s.ngay_lam_viec);
                const ngayStr = `${String(ngay.getDate()).padStart(2, '0')}/${String(ngay.getMonth() + 1).padStart(2, '0')}/${ngay.getFullYear()}`;
                const conTrong = s.so_luong_toi_da - s.so_luong_hien_tai;
                context += `• BS. ${s.ten_bac_si} — Ngày ${ngayStr} — Ca ${s.khung_gio} — Còn ${conTrong > 0 ? conTrong : 0} chỗ\n`;
            });
        } else {
            context += '• Chưa có lịch làm việc sắp tới\n';
        }

        // Lưu cache 5 phút
        cachedClinicContext = context;
        cacheExpiry = Date.now() + 5 * 60 * 1000;

        return context;
    } catch (error) {
        console.error('Lỗi lấy context phòng khám:', error);
        return cachedClinicContext || '\n(Không thể tải thông tin phòng khám lúc này)\n';
    }
};

// ====================================================
// CONTEXT RIÊNG: Lịch sử khám + đơn thuốc CỦA BỆNH NHÂN ĐANG ĐĂNG NHẬP
// ❌ KHÔNG CACHE — Mỗi lần hỏi đều query mới nhất
// ====================================================
const getPatientContext = async (taiKhoanId) => {
    if (!taiKhoanId) return ''; // Khách chưa đăng nhập → không có thông tin cá nhân

    try {
        const pool = await connectDB();

        // Lấy lịch sử khám bệnh + ghi chú/đơn thuốc của bác sĩ (5 lịch gần nhất)
        const appointments = await pool.request()
            .input('benh_nhan_id', sql.Int, taiKhoanId)
            .query(`
                SELECT TOP 5
                    lk.trang_thai, lk.mo_ta_trieu_chung, lk.ghi_chu_cua_bac_si, lk.gio_kham,
                    llv.ngay_lam_viec,
                    ISNULL(bs_nd.ho_ten, bs_tk.ten_dang_nhap) as ten_bac_si,
                    ck.ten_chuyen_khoa
                FROM LichKham lk
                JOIN LichLamViec llv ON lk.lich_lam_viec_id = llv.id
                JOIN TaiKhoan bs_tk ON llv.bac_si_id = bs_tk.id
                LEFT JOIN HoSoNguoiDung bs_nd ON bs_tk.id = bs_nd.tai_khoan_id
                LEFT JOIN HoSoBacSi bs ON bs_tk.id = bs.tai_khoan_id
                LEFT JOIN ChuyenKhoa ck ON bs.chuyen_khoa_id = ck.id
                WHERE lk.benh_nhan_id = @benh_nhan_id
                ORDER BY lk.ngay_tao DESC
            `);

        if (appointments.recordset.length === 0) {
            return '\n═══ HỒ SƠ BỆNH NHÂN ĐANG ĐĂNG NHẬP ═══\nBệnh nhân chưa có lịch sử khám bệnh nào.\n';
        }

        let patientCtx = '\n═══ HỒ SƠ BỆNH NHÂN ĐANG ĐĂNG NHẬP (5 lần khám gần nhất) ═══\n';
        appointments.recordset.forEach((a, i) => {
            const ngay = new Date(a.ngay_lam_viec);
            const ngayStr = `${String(ngay.getDate()).padStart(2, '0')}/${String(ngay.getMonth() + 1).padStart(2, '0')}/${ngay.getFullYear()}`;

            const trangThaiMap = {
                'Pending': '⏳ Chờ duyệt',
                'Approved': '✅ Đã duyệt',
                'Done': '✔️ Đã khám xong',
                'Cancelled': '❌ Đã hủy'
            };
            const trangThai = trangThaiMap[a.trang_thai?.trim()] || a.trang_thai;

            patientCtx += `\n📋 Lần khám ${i + 1}:\n`;
            patientCtx += `  - Ngày: ${ngayStr} | Giờ: ${a.gio_kham || 'N/A'}\n`;
            patientCtx += `  - Bác sĩ: BS. ${a.ten_bac_si} (${a.ten_chuyen_khoa || 'Đa khoa'})\n`;
            patientCtx += `  - Trạng thái: ${trangThai}\n`;
            patientCtx += `  - Triệu chứng: ${a.mo_ta_trieu_chung || 'Không có'}\n`;
            patientCtx += `  - Ghi chú/Đơn thuốc của bác sĩ: ${a.ghi_chu_cua_bac_si || 'Chưa có ghi chú'}\n`;
        });

        return patientCtx;
    } catch (error) {
        console.error('Lỗi lấy hồ sơ bệnh nhân:', error);
        return '';
    }
};

// ====================================================
// HÀM TỰ ĐỘNG RETRY KHI BỊ LỖI 429 (QUOTA)
// ====================================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiWithRetry = async (chat, message, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await chat.sendMessage(message);
            return result.response.text();
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries) {
                const waitTime = (attempt + 1) * 15000;
                console.log(`⏳ Quota exceeded, đợi ${waitTime / 1000}s rồi thử lại (lần ${attempt + 1})...`);
                await sleep(waitTime);
            } else {
                throw error;
            }
        }
    }
};

// ====================================================
// CHỐNG SPAM: Giới hạn mỗi phiên chat 1 request / 3 giây
// ====================================================
const lastRequestTime = {};

// ====================================================
// HÀM TẠO MODEL GEMINI VỚI SYSTEM PROMPT + CONTEXT
// ====================================================
const createGeminiModel = (fullContext) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const fullSystemPrompt = SYSTEM_PROMPT + fullContext;

    return genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: fullSystemPrompt
    });
};

// ====================================================
// API: GỬI TIN NHẮN CHO CHATBOT
// POST /api/chatbot/send
// Body: { message, phien_id, tai_khoan_id?, nguoi_gui? }
// ====================================================
const sendMessage = async (req, res) => {
    try {
        const { message, phien_id, tai_khoan_id, nguoi_gui } = req.body;

        if (!message || !phien_id) {
            return res.status(400).json({ message: 'Thiếu nội dung tin nhắn hoặc mã phiên!' });
        }

        // CHỐNG SPAM: Chặn nếu gửi quá nhanh (< 3 giây)
        const now = Date.now();
        if (lastRequestTime[phien_id] && (now - lastRequestTime[phien_id]) < 3000) {
            return res.status(429).json({
                reply: 'Bạn gửi tin nhắn quá nhanh, vui lòng chờ vài giây rồi thử lại nhé! 😊',
                nguoi_gui: 'TT Medical AI'
            });
        }
        lastRequestTime[phien_id] = now;

        const tenNguoiGui = nguoi_gui || 'Khách';
        const pool = await connectDB();

        // 1. Lưu tin nhắn USER vào DB
        await pool.request()
            .input('phien_id', sql.VarChar(50), phien_id)
            .input('tai_khoan_id', sql.Int, tai_khoan_id || null)
            .input('nguoi_gui', sql.NVarChar(50), tenNguoiGui)
            .input('noi_dung', sql.NVarChar(sql.MAX), message)
            .query(`
                INSERT INTO ChatBot (phien_id, tai_khoan_id, nguoi_gui, noi_dung, ngay_tao)
                VALUES (@phien_id, @tai_khoan_id, @nguoi_gui, @noi_dung, GETDATE())
            `);

        // 2. Lấy CONTEXT CHUNG (cache) + CONTEXT RIÊNG (bệnh nhân đang đăng nhập)
        const clinicContext = await getClinicContext();
        const patientContext = await getPatientContext(tai_khoan_id);
        const fullContext = clinicContext + patientContext;

        // DEBUG: In ra để kiểm tra context
        console.log('\n🔍 DEBUG CHATBOT:');
        console.log('  → tai_khoan_id:', tai_khoan_id);
        console.log('  → nguoi_gui:', tenNguoiGui);
        console.log('  → patientContext length:', patientContext.length);
        console.log('  → patientContext:', patientContext.substring(0, 300) + '...');

        // 3. Tạo model Gemini với đầy đủ context
        const geminiModel = createGeminiModel(fullContext);

        // 4. Chuẩn bị lịch sử hội thoại
        if (!chatSessions[phien_id]) {
            chatSessions[phien_id] = [];
        }

        // 5. Tạo chat session với lịch sử cũ
        const chat = geminiModel.startChat({
            history: chatSessions[phien_id]
        });

        // 6. Gửi tin nhắn VỚI AUTO-RETRY
        const botReply = await callGeminiWithRetry(chat, message);

        // 7. Cập nhật lịch sử hội thoại
        chatSessions[phien_id].push(
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [{ text: botReply }] }
        );

        // Giữ tối đa 20 tin nhắn gần nhất
        if (chatSessions[phien_id].length > 20) {
            chatSessions[phien_id] = chatSessions[phien_id].slice(-20);
        }

        // 8. Lưu phản hồi BOT vào DB
        await pool.request()
            .input('phien_id', sql.VarChar(50), phien_id)
            .input('tai_khoan_id', sql.Int, tai_khoan_id || null)
            .input('nguoi_gui', sql.NVarChar(50), 'TT Medical AI')
            .input('noi_dung', sql.NVarChar(sql.MAX), botReply)
            .query(`
                INSERT INTO ChatBot (phien_id, tai_khoan_id, nguoi_gui, noi_dung, ngay_tao)
                VALUES (@phien_id, @tai_khoan_id, @nguoi_gui, @noi_dung, GETDATE())
            `);

        // 9. Trả về cho frontend
        res.json({
            reply: botReply,
            nguoi_gui: 'TT Medical AI'
        });

    } catch (error) {
        console.error('Lỗi Chatbot:', error);
        res.status(500).json({
            reply: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau hoặc gọi hotline 1900 6868 để được hỗ trợ! 🙏',
            nguoi_gui: 'TT Medical AI'
        });
    }
};

// ====================================================
// API: RESET CUỘC HỘI THOẠI
// ====================================================
const resetChat = async (req, res) => {
    try {
        const { phien_id } = req.body;
        if (phien_id && chatSessions[phien_id]) {
            delete chatSessions[phien_id];
        }
        res.json({ message: 'Đã reset cuộc hội thoại!' });
    } catch (error) {
        console.error('Lỗi reset chat:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// ====================================================
// API: LẤY LỊCH SỬ CHAT CỦA 1 PHIÊN
// ====================================================
const getChatHistory = async (req, res) => {
    try {
        const { phien_id } = req.params;
        const pool = await connectDB();
        const result = await pool.request()
            .input('phien_id', sql.VarChar(50), phien_id)
            .query(`
                SELECT nguoi_gui, noi_dung, ngay_tao
                FROM ChatBot
                WHERE phien_id = @phien_id
                ORDER BY ngay_tao ASC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Lỗi lấy lịch sử chat:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = { sendMessage, resetChat, getChatHistory };
