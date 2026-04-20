// 1. CHUYỂN TABS CHÍNH
function switchTab(event, tabId) {
    event.preventDefault();
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// 2. CHUYỂN SUB-TABS (LỌC LỊCH KHÁM)
function filterAppointments(event, status) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// 3. ĐĂNG XUẤT
function confirmLogout(event) {
    if(event) event.preventDefault();
    Swal.fire({
        title: 'Đăng xuất?', text: "Thoát khỏi phiên làm việc của Bác sĩ?", icon: 'question',
        showCancelButton: true, confirmButtonColor: '#0284C7', cancelButtonColor: '#64748B',
        confirmButtonText: 'Đăng xuất', cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) { 
            Swal.fire({ title: 'Đăng xuất thành công!', text: 'Đang chuyển hướng về trang chủ...', icon: 'success', showConfirmButton: false, timer: 1500 })
            .then(() => { localStorage.clear(); window.location.href = '../index.html'; });
        }
    });
}

// 4. NGHIỆP VỤ: KHÁM BỆNH & KÊ ĐƠN
function openMedicalRecord(maLK, tenBN) {
    Swal.fire({
        title: `Khám bệnh: ${tenBN} (${maLK})`,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px;">Chẩn đoán bệnh (*)</label>
                    <input id="chan_doan" class="swal2-input" placeholder="VD: Viêm họng cấp..." style="width: 90%; margin: 0;">
                </div>
                <div>
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px;">Kê đơn thuốc / Ghi chú</label>
                    <textarea id="don_thuoc" class="swal2-textarea" placeholder="1. Paracetamol 500mg - 10 viên..." style="width: 90%; margin: 0; height: 100px;"></textarea>
                </div>
            </div>
        `,
        width: '600px', showCancelButton: true, confirmButtonText: 'Hoàn tất khám', cancelButtonText: 'Hủy', confirmButtonColor: '#10B981',
        preConfirm: () => {
            const chanDoan = document.getElementById('chan_doan').value;
            if (!chanDoan) Swal.showValidationMessage('Vui lòng nhập chẩn đoán!');
            return { chanDoan: chanDoan, donThuoc: document.getElementById('don_thuoc').value };
        }
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Hoàn thành!', 'Hồ sơ bệnh án đã được lưu.', 'success');
    });
}

// 5. NGHIỆP VỤ: DUYỆT & HỦY LỊCH
function approveAppointment(maLK) {
    Swal.fire({ title: 'Duyệt lịch?', text: `Chấp nhận lịch ${maLK}?`, icon: 'info', showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Duyệt' })
    .then((result) => { if(result.isConfirmed) Swal.fire('Đã duyệt!', '', 'success'); });
}
function cancelAppointment(maLK) {
    Swal.fire({ title: 'Hủy lịch?', input: 'text', inputPlaceholder: 'Lý do hủy...', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Hủy lịch' })
    .then((result) => { if(result.isConfirmed && result.value) Swal.fire('Đã hủy!', '', 'success'); });
}

// 6. NGHIỆP VỤ: TRẢ LỜI CÂU HỎI Q&A
function replyQA(maCH) {
    Swal.fire({
        title: 'Phản hồi bệnh nhân', input: 'textarea', inputPlaceholder: 'Nhập câu trả lời của Bác sĩ...',
        showCancelButton: true, confirmButtonColor: '#0284C7', confirmButtonText: 'Gửi phản hồi'
    }).then((result) => {
        if (result.isConfirmed && result.value) Swal.fire('Đã gửi!', 'Câu trả lời đã được gửi đến bệnh nhân.', 'success');
    });
}

// ==========================================
// 7. FORM ĐĂNG KÝ CA LÀM VIỆC
// ==========================================
function openShiftModal() {
    Swal.fire({
        title: 'Đăng ký ca làm việc',
        width: '500px',
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Ngày làm việc (*)</label>
                <input type="date" id="shift_date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 0 20px 0;">
                
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Từ giờ (*)</label>
                        <input type="time" id="shift_start" class="swal2-input" value="08:00" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Đến giờ (*)</label>
                        <input type="time" id="shift_end" class="swal2-input" value="11:30" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
                    </div>
                </div>

                <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Số lượng Bệnh nhân tối đa nhận (*)</label>
                <input type="number" id="shift_max" class="swal2-input" value="20" min="1" max="100" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Đăng ký ca', confirmButtonColor: '#0284C7', cancelButtonText: 'Hủy',
        preConfirm: () => {
            const date = document.getElementById('shift_date').value;
            const start = document.getElementById('shift_start').value;
            const end = document.getElementById('shift_end').value;
            const max = document.getElementById('shift_max').value;

            if (!date) { Swal.showValidationMessage('Vui lòng chọn ngày làm việc!'); return false; }
            if (!start || !end) { Swal.showValidationMessage('Vui lòng chọn thời gian bắt đầu và kết thúc!'); return false; }
            if (start >= end) { Swal.showValidationMessage('Thời gian kết thúc phải lớn hơn thời gian bắt đầu!'); return false; }
            if (!max || max <= 0) { Swal.showValidationMessage('Số lượng bệnh nhân phải lớn hơn 0!'); return false; }

            return { date, start, end, max };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const data = result.value;
            const d = new Date(data.date);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const timeString = `${data.start} - ${data.end}`;

            const tbody = document.querySelector('#tab-lich-lam-viec tbody');
            if(tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>${formattedDate}</b></td>
                    <td><span style="color: var(--primary); font-weight: 600;">${timeString}</span></td>
                    <td>${data.max} Bệnh nhân / Ca</td>
                    <td><span style="color: #64748B; font-weight: bold;">0/${data.max} (Ca mới)</span></td>
                `;
                tbody.appendChild(tr);
            }
            Swal.fire('Thành công!', `Đã đăng ký ca khám từ ${timeString} ngày ${formattedDate}.`, 'success');
        }
    });
}

// ==========================================
// ĐỒNG BỘ DỮ LIỆU THẬT LÊN GIAO DIỆN BÁC SĨ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const userInfoString = localStorage.getItem('userInfo');
    
    if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        
        // 1. CẬP NHẬT NAVBAR
        const docName = userInfo.ho_ten || userInfo.ten_dang_nhap || "Bác sĩ";
        const elDoctorName = document.getElementById('doctorName');
        if (elDoctorName) elDoctorName.innerText = docName;

        // XỬ LÝ AVATAR TRÁNH LỖI VỠ ẢNH
        const avatarImg = document.getElementById('nav_doctor_img');
        if (avatarImg) {
            // Tự động tạo ảnh bằng chữ cái đầu (VD: Thiệu -> T)
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=0284C7&color=fff&rounded=true&bold=true`;
            
            if (userInfo.anh_dai_dien) {
                avatarImg.src = `http://localhost:3000/uploads/${userInfo.anh_dai_dien}`;
                // Nếu ảnh server bị lỗi, tự đổi sang ảnh chữ cái
                avatarImg.onerror = function() {
                    this.src = fallbackAvatar;
                };
            } else {
                avatarImg.src = fallbackAvatar;
            }
        }

        // 2. CẬP NHẬT TAB HỒ SƠ CHUYÊN MÔN
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setText('hs_ten', userInfo.ho_ten || "Chưa cập nhật");
        setText('hs_sdt', userInfo.so_dien_thoai || "Chưa cập nhật");
        setText('hs_email', userInfo.email || "Chưa cập nhật");
        setText('hs_chuyen_khoa', userInfo.ten_chuyen_khoa || "Chưa phân khoa");
        
        const exp = userInfo.nam_kinh_nghiem ? `${userInfo.nam_kinh_nghiem} năm` : "Chưa cập nhật";
        setText('hs_kinh_nghiem', exp);

        // Format tiền tệ VNĐ
        const fee = userInfo.phi_kham ? new Intl.NumberFormat('vi-VN').format(userInfo.phi_kham) : "Chưa cập nhật";
        setText('hs_phi_kham', fee);

        setText('hs_tieu_su', userInfo.tieu_su || "Chưa cập nhật tiểu sử.");
        
    } else {
        // NẾU KHÔNG CÓ DỮ LIỆU (Chưa đăng nhập) -> Đuổi về trang login
        window.location.href = '../login.html'; 
    }
});