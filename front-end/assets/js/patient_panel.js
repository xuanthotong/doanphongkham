// ==================================================
// 1. HÀM ĐIỀU KHIỂN GIAO DIỆN (UI CONTROLS)
// ==================================================
function switchTab(event, tabId) {
    if (event) event.preventDefault();
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    if (event && event.currentTarget.classList.contains('tab-link')) {
        event.currentTarget.classList.add('active');
    }
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }
    if (tabId === 'tab-trang-chu') window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToSection(sectionId, event) {
    if (event) event.preventDefault();
    switchTab(null, 'tab-trang-chu');
    setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function openModal(modalId, e) {
    if(e) e.preventDefault();
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto'; 
}

function closeDoctorDetailsModal() {
    closeModal('doctorDetailModal');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==================================================
// 2. ĐỔ DỮ LIỆU TỪ LOCALSTORAGE VÀO GIAO DIỆN BỆNH NHÂN
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    const userInfoString = localStorage.getItem('userInfo');
    
    if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        
        // Cập nhật Navbar (Góc phải)
        const patientName = userInfo.ho_ten || userInfo.ten_dang_nhap || "Bệnh nhân";
        const elPatientName = document.getElementById('patientName');
        if (elPatientName) elPatientName.innerText = patientName;

        const avatarImg = document.getElementById('nav_patient_img');
        if (avatarImg) {
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(patientName)}&background=10B981&color=fff&rounded=true&bold=true`;
            if (userInfo.anh_dai_dien) {
                if (userInfo.anh_dai_dien.startsWith('data:image') || userInfo.anh_dai_dien.startsWith('http')) {
                    avatarImg.src = userInfo.anh_dai_dien;
                } else {
                    avatarImg.src = `http://localhost:3000/uploads/${userInfo.anh_dai_dien}`;
                }
                avatarImg.onerror = function() { this.src = fallbackAvatar; };
            } else {
                avatarImg.src = fallbackAvatar;
            }
        }

        // Cập nhật Form Hồ sơ cá nhân
        if (document.getElementById('pt_ten')) {
            document.getElementById('pt_ten').value = userInfo.ho_ten || "";
            document.getElementById('pt_ten').placeholder = "Nhập họ và tên";
        }
        if (document.getElementById('pt_sdt')) {
            document.getElementById('pt_sdt').value = userInfo.so_dien_thoai || "";
            document.getElementById('pt_sdt').placeholder = "Nhập số điện thoại";
        }
        if (document.getElementById('pt_email')) {
            document.getElementById('pt_email').value = userInfo.email || "";
        }
        if (document.getElementById('pt_dia_chi')) {
            document.getElementById('pt_dia_chi').value = userInfo.dia_chi || "";
            document.getElementById('pt_dia_chi').placeholder = "Nhập địa chỉ";
        }
        if (document.getElementById('pt_gioi_tinh')) {
            let gt = "1";
            if (userInfo.gioi_tinh === false || userInfo.gioi_tinh === 0 || userInfo.gioi_tinh === "0") gt = "0";
            document.getElementById('pt_gioi_tinh').value = gt;
        }

        // 1. Tải danh sách câu hỏi động từ Cơ sở dữ liệu khi mở trang
        loadCommunityQA();
        
        // 2. Tải danh sách chuyên khoa động
        loadSpecialtiesForQA();

        // 3. Tải Hồ sơ sức khỏe & Lịch sử khám bệnh
        fetchMedicalHistory();

    } else {
        // Chưa đăng nhập -> Trở về trang chủ
        window.location.href = '../../index.html'; 
    }
});

// ==================================================
// 3. GỬI CÂU HỎI & RENDER VÀO GIAO DIỆN (CHUẨN VERCEL)
// ==================================================
async function submitQuestion(e) {
    e.preventDefault();
    
    const chuyenKhoa = document.getElementById('qa_chuyen_khoa').value;
    const tieuDe = document.getElementById('qa_tieu_de').value;
    const noiDung = document.getElementById('qa_noi_dung').value;

    // THÊM: Lấy trạng thái của ô checkbox Ẩn danh
    const cbAnDanh = document.getElementById('qa_an_danh');
    const isAnDanh = cbAnDanh ? cbAnDanh.checked : false;

    // Bắt buộc chọn chuyên khoa
    if (!chuyenKhoa) {
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn Chuyên khoa cho câu hỏi của bạn!', 'warning');
        return;
    }

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) {
        Swal.fire('Lỗi', 'Vui lòng đăng nhập để gửi câu hỏi!', 'error');
        return;
    }

    Swal.fire({
        title: 'Xác nhận gửi?',
        text: "Câu hỏi sẽ được gửi lên hệ thống để Bác sĩ giải đáp.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Gửi ngay',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#0284C7'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch('http://localhost:3000/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // NẾU ẨN DANH => GỬI NULL, NẾU KHÔNG => GỬI ID THẬT
                        benh_nhan_id: isAnDanh ? null : userInfo.id,
                        tieu_de: tieuDe,
                        noi_dung: noiDung,
                        chuyen_khoa_id: chuyenKhoa ? parseInt(chuyenKhoa) : null
                    })
                });

                if (response.ok) {
                    document.getElementById('qaForm').reset();
                    Swal.fire('Hoàn tất!', 'Câu hỏi đã gửi thành công.', 'success');
                    loadCommunityQA(); 
                } else {
                    Swal.fire('Lỗi!', 'Không thể gửi câu hỏi lúc này.', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
}

// ==================================================
// LOAD VÀ LỌC DANH SÁCH CÂU HỎI ĐỘNG
// ==================================================
window.allCommunityQA = []; // Biến lưu toàn bộ câu hỏi
window.currentQASpecialty = 'all'; // Trạng thái lọc theo chuyên khoa
window.currentQAStatus = 'all'; // Trạng thái lọc theo tình trạng

async function loadCommunityQA() {
    try {
        // Thêm timestamp để chống trình duyệt lưu Cache cũ
        const res = await fetch(`http://localhost:3000/api/questions?t=${new Date().getTime()}`);
        window.allCommunityQA = await res.json();
        
        // Kiểm tra xem Backend có trả về chuyen_khoa_id không
        if (window.allCommunityQA.length > 0 && window.allCommunityQA[0].chuyen_khoa_id === undefined) {
            console.error("⚠️ LỖI BACKEND: API /api/questions không trả về cột 'chuyen_khoa_id'. Các bộ lọc sẽ không hoạt động!");
        }
        
        renderCommunityQA(); // Gọi hàm render để áp dụng bộ lọc
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỏi đáp:', error);
    }
}

function renderCommunityQA() {
    try {
        const list = document.getElementById('community_qa_list');
        if (!list) return;
        list.innerHTML = '';

        // Áp dụng thuật toán Lọc dữ liệu (Filter) an toàn
        let filteredQuestions = window.allCommunityQA.filter(q => {
            // 1. Lọc Chuyên khoa (Ép kiểu về chuỗi để so sánh chuẩn xác 100%)
            const filterSp = window.currentQASpecialty.toString();
            const qSp = q.chuyen_khoa_id ? q.chuyen_khoa_id.toString() : 'null';
            const matchSpecialty = (filterSp === 'all') || (qSp === filterSp);
            
            // 2. Lọc Trạng thái (Kiểm tra cả trang_thai và nội dung chuỗi tra_loi)
            const isAnswered = q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== '');
            const matchStatus = (window.currentQAStatus === 'all') || 
                                (window.currentQAStatus === 'answered' && isAnswered) || 
                                (window.currentQAStatus === 'pending' && !isAnswered);
                                
            return matchSpecialty && matchStatus;
        });

        let countEl = document.getElementById('qa_count');
        if(countEl) countEl.innerText = filteredQuestions.length;

        if (filteredQuestions.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #64748B; padding: 20px 0;">Không có câu hỏi nào phù hợp với bộ lọc hiện tại.</p>';
            return;
        }

        let qaHTML = '';
        filteredQuestions.forEach(q => {
            const date = new Date(q.ngay_tao || Date.now());
            const dateString = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            // Cập nhật để hiển thị chữ Ẩn danh thay vì "Bệnh nhân" trên giao diện cộng đồng
            const tenNguoiHoi = q.nguoi_hoi ? q.nguoi_hoi : "Ẩn danh";
            const chuCaiDau = tenNguoiHoi.charAt(0).toUpperCase();
            
            const statusBadge = q.trang_thai || q.tra_loi 
                ? `<span class="qa-badge" style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã trả lời</span>` 
                : `<span class="qa-badge qa-pending" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Chờ phản hồi</span>`;

            const nguoiDaTraLoi = q.ten_nguoi_tra_loi ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? 'Quản trị viên' : `BS. ${q.ten_nguoi_tra_loi}`) : 'Bác sĩ';
            const answerHtml = q.tra_loi 
                ? `<div style="margin-top: 15px; padding: 12px; background: #F0F9FF; border-left: 4px solid #0284C7; border-radius: 4px;">
                     <strong style="color: #0284c7;">${nguoiDaTraLoi} trả lời:</strong> <p style="margin: 5px 0 0 0; color: #334155; font-size: 14px;">${q.tra_loi}</p>
                   </div>` 
                : '';

            qaHTML += `
                <div class="qa-card" style="animation: fadeIn 0.5s;">
                    <div class="qa-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="qa-user-info" style="display:flex; align-items:center; gap: 10px;">
                            <div class="qa-avatar" style="background: #e2e8f0; color: #475569; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:bold;">${chuCaiDau}</div>
                            <div class="qa-meta" style="font-size: 13px; color: #64748B;">
                                <span class="qa-name" style="font-weight:bold; color:#0F172A;">${tenNguoiHoi}</span> • 
                                <span class="qa-date">${dateString}</span>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                    <h3 class="qa-title" style="margin-top: 15px; font-size: 16px; color: #0F172A;">${q.tieu_de || 'Câu hỏi'}</h3>
                    <p class="qa-desc" style="color: #475569; font-size: 14px; margin-top: 5px;">${q.noi_dung || ''}</p>
                    ${answerHtml}
                </div>
            `;
        });
        // Gán 1 lần duy nhất để chống lỗi vòng lặp
        list.innerHTML = qaHTML;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỏi đáp:', error);
    }
}

// ==================================================
// LOAD DANH SÁCH CHUYÊN KHOA CHO HỎI ĐÁP
// ==================================================
async function loadSpecialtiesForQA() {
    try {
        const res = await fetch('http://localhost:3000/api/specialties');
        if (!res.ok) throw new Error('Lỗi khi tải chuyên khoa');
        const specialties = await res.json();

        // 1. Đổ dữ liệu vào select box (Dropdown)
        const selectEl = document.getElementById('qa_chuyen_khoa');
        if (selectEl) {
            selectEl.innerHTML = '<option value="">Chọn chuyên khoa</option>';
            specialties.forEach(sp => {
                selectEl.innerHTML += `<option value="${sp.id}">${sp.ten_chuyen_khoa}</option>`;
            });
        }

        // 2. Đổ dữ liệu vào các pill lọc (Nút bấm)
        const pillsContainer = document.getElementById('qa_filter_pills');
        if (pillsContainer) {
            pillsContainer.innerHTML = `<button class="qa-pill active" onclick="filterQABySpecialty('all', this)">Tất cả</button>`;
            specialties.forEach(sp => {
                pillsContainer.innerHTML += `<button class="qa-pill" onclick="filterQABySpecialty(${sp.id}, this)">${sp.ten_chuyen_khoa}</button>`;
            });
        }
    } catch (error) {
        console.error('Lỗi tải chuyên khoa:', error);
    }
}

// HÀM KÍCH HOẠT KHI BẤM NÚT LỌC CHUYÊN KHOA
function filterQABySpecialty(specialtyId, element) {
    document.querySelectorAll('#qa_filter_pills .qa-pill').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    window.currentQASpecialty = specialtyId;
    renderCommunityQA();
}

// HÀM KÍCH HOẠT KHI CHỌN DROPDOWN TRẠNG THÁI
function filterQAByStatus(status) {
    window.currentQAStatus = status;
    renderCommunityQA();
}

// ==================================================
// 4. ĐĂNG XUẤT VỀ TRANG CHỦ
// ==================================================
function confirmLogout(event) {
    if(event) event.preventDefault();
    Swal.fire({
        title: 'Đăng xuất?', 
        text: "Bạn có muốn đăng xuất khỏi tài khoản không?", 
        icon: 'question',
        showCancelButton: true, 
        confirmButtonColor: '#0284C7', 
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Đăng xuất', 
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) { 
            Swal.fire({ title: 'Đăng xuất thành công!', text: 'Đang chuyển hướng về trang chủ...', icon: 'success', showConfirmButton: false, timer: 1500 })
            .then(() => { 
                // Chỉ xóa phiên đăng nhập của Bệnh nhân, giữ lại dữ liệu Bác sĩ nếu có
                localStorage.removeItem('token'); 
                localStorage.removeItem('userInfo'); 
                window.location.href = '../index.html'; 
            });
        }
    });
}

// ==================================================
// 5. CẬP NHẬT HỒ SƠ CÁ NHÂN BỆNH NHÂN (LƯU DB)
// ==================================================
async function updatePatientProfile(event) {
    if(event) event.preventDefault();
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) return;

    const dia_chi = document.getElementById('pt_dia_chi').value.trim();
    const gioi_tinh = document.getElementById('pt_gioi_tinh').value; // Đảm bảo input này trả về 1 hoặc 0 (Nam/Nữ)

    try {
        // Gọi API PUT để cập nhật bảng HoSoNguoiDung
        const response = await fetch(`http://localhost:3000/api/accounts/profile/${userInfo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dia_chi, gioi_tinh })
        });

        if (response.ok) {
            Swal.fire('Thành công!', 'Cập nhật hồ sơ thành công!', 'success');
            // Cập nhật lại dữ liệu đang lưu ảo trong LocalStorage
            userInfo.dia_chi = dia_chi;
            userInfo.gioi_tinh = parseInt(gioi_tinh);
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
        } else {
            const errData = await response.json();
            Swal.fire('Lỗi!', errData.message || 'Không thể cập nhật hồ sơ.', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
    }
}

// ==================================================
// HÀM CHUYỂN TAB TRONG TRANG HỒ SƠ
// ==================================================
function switchProfileTab(tabName) {
    const btnHistory = document.getElementById('btn-tab-history');
    const btnRecord = document.getElementById('btn-tab-record');
    const contentHistory = document.getElementById('content-tab-history');
    const contentRecord = document.getElementById('content-tab-record');

    if (tabName === 'history') {
        btnHistory.style.cssText = 'flex: 1; padding: 18px; border: none; background: #fff; border-bottom: 3px solid #0284c7; color: #0284c7; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.3s;';
        btnRecord.style.cssText = 'flex: 1; padding: 18px; border: none; background: transparent; border-bottom: 3px solid transparent; color: #64748b; font-weight: 600; font-size: 16px; cursor: pointer; transition: 0.3s;';

        contentHistory.style.display = 'block';
        contentRecord.style.display = 'none';
    } else {
        btnRecord.style.cssText = 'flex: 1; padding: 18px; border: none; background: #fff; border-bottom: 3px solid #10b981; color: #10b981; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.3s;';
        btnHistory.style.cssText = 'flex: 1; padding: 18px; border: none; background: transparent; border-bottom: 3px solid transparent; color: #64748b; font-weight: 600; font-size: 16px; cursor: pointer; transition: 0.3s;';

        contentHistory.style.display = 'none';
        contentRecord.style.display = 'block';
    }
}

// ==================================================
// 6. ĐỔ DỮ LIỆU HỒ SƠ SỨC KHỎE & LỊCH SỬ KHÁM
// ==================================================
async function fetchMedicalHistory() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) return;

    // LƯU Ý QUAN TRỌNG: Đây là 2 ID dùng để in dữ liệu ra file HTML. 
    // Bạn hãy kiểm tra file HTML của mình xem đã có 2 thẻ div với id này chưa nhé!
    const containerLichSu = document.getElementById('lich_su_kham_list'); // Vùng in Lịch sử đặt lịch
    const containerHoSo = document.getElementById('ho_so_suc_khoe_list'); // Vùng in Hồ sơ (Đơn thuốc)

    try {
        // Thêm ?t=... để bắt buộc Server phải trả về dữ liệu mới nhất
        const res = await fetch(`http://localhost:3000/api/appointments/patient/${userInfo.id}?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const history = await res.json();

        // ===========================================
        // 1. ĐỔ DỮ LIỆU VÀO VÙNG "LỊCH SỬ KHÁM"
        // ===========================================
        if (containerLichSu) {
            containerLichSu.innerHTML = '';
            if (history.length === 0) {
                containerLichSu.innerHTML = '<div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;"><i class="fa-regular fa-calendar-xmark" style="font-size: 40px; color: #94a3b8; margin-bottom: 15px;"></i><p style="color: #64748b; font-size: 15px; margin: 0;">Bạn chưa có lịch sử đặt khám nào.</p></div>';
            } else {
                let lichSuHTML = '';
                history.forEach(app => {
                    const d = new Date(app.ngay_lam_viec);
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                    const timeShow = app.gio_kham || app.khung_gio;
                    
                    let statusHtml = '';
                    let borderColor = '#e2e8f0';
                    let iconHtml = '';
                    const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
                    
                    if (status === 'pending') {
                        statusHtml = `<span style="background:#fef3c7; color:#d97706; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;"><i class="fa-solid fa-hourglass-half"></i> Chờ duyệt</span>`;
                        borderColor = '#f59e0b';
                        iconHtml = `<div style="min-width: 45px; height: 45px; border-radius: 50%; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 18px;"><i class="fa-regular fa-clock"></i></div>`;
                    } else if (status === 'approved') {
                        statusHtml = `<span style="background:#dcfce7; color:#166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;"><i class="fa-solid fa-check"></i> Đã duyệt</span>`;
                        borderColor = '#10b981';
                        iconHtml = `<div style="min-width: 45px; height: 45px; border-radius: 50%; background: #dcfce7; color: #166534; display: flex; align-items: center; justify-content: center; font-size: 18px;"><i class="fa-regular fa-calendar-check"></i></div>`;
                    } else if (status === 'cancelled') {
                        statusHtml = `<span style="background:#fee2e2; color:#991b1b; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;"><i class="fa-solid fa-xmark"></i> Đã hủy</span>`;
                        borderColor = '#ef4444';
                        iconHtml = `<div style="min-width: 45px; height: 45px; border-radius: 50%; background: #fee2e2; color: #991b1b; display: flex; align-items: center; justify-content: center; font-size: 18px;"><i class="fa-regular fa-calendar-xmark"></i></div>`;
                    } else if (status === 'done') {
                        statusHtml = `<span style="background:#e0f2fe; color:#0369a1; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;"><i class="fa-solid fa-check-double"></i> Đã khám</span>`;
                        borderColor = '#0ea5e9';
                        iconHtml = `<div style="min-width: 45px; height: 45px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 18px;"><i class="fa-solid fa-stethoscope"></i></div>`;
                    }

                    let reasonCancel = (status === 'cancelled' && app.ghi_chu_cua_bac_si) ? `<div style="margin-top: 15px; padding: 10px 15px; background: #fef2f2; border-radius: 8px; font-size: 13px; color: #b91c1c; border-left: 3px solid #ef4444;"><strong>Lý do hủy:</strong> ${app.ghi_chu_cua_bac_si}</div>` : '';

                    lichSuHTML += `
                        <div style="border: 1px solid #e2e8f0; border-left: 4px solid ${borderColor}; border-radius: 12px; padding: 20px; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.03); transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 15px; display: flex; gap: 15px; align-items: flex-start;">
                            ${iconHtml}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <h4 style="margin: 0; color: #0f172a; font-size: 16px;">BS. ${app.ten_bac_si || 'Chưa cập nhật'}</h4>
                                    ${statusHtml}
                                </div>
                                <div style="color: #64748b; font-size: 13px; margin-bottom: 10px;">
                                    <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; margin-right: 10px;"><i class="fa-solid fa-hashtag"></i> Mã: LK${app.id}</span>
                                    <span><i class="fa-regular fa-clock" style="color: #0284c7;"></i> ${timeShow}</span> &nbsp;|&nbsp; 
                                    <span><i class="fa-regular fa-calendar" style="color: #10b981;"></i> ${dateStr}</span>
                                </div>
                                <div style="color: #475569; font-size: 14px; background: #f8fafc; padding: 10px 15px; border-radius: 8px;">
                                    <strong style="color: #334155;">Triệu chứng:</strong> ${app.mo_ta_trieu_chung || 'Không có ghi chú'}
                                </div>
                                ${reasonCancel}
                            </div>
                        </div>
                    `;
                });
                containerLichSu.innerHTML = lichSuHTML; // In dữ liệu ra 1 lần duy nhất
            }
        } else {
            console.warn("⚠️ HTML bị thiếu: Không tìm thấy thẻ div nào có id='lich_su_kham_list'");
        }

        // ===========================================
        // 2. ĐỔ DỮ LIỆU VÀO VÙNG "HỒ SƠ SỨC KHỎE" (Chỉ hiện Đã Khám / Đơn Thuốc)
        // ===========================================
        if (containerHoSo) {
            containerHoSo.innerHTML = '';
            const donThuocList = history.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'done');
            
            if (donThuocList.length === 0) {
                containerHoSo.innerHTML = '<div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1;"><i class="fa-solid fa-notes-medical" style="font-size: 40px; color: #94a3b8; margin-bottom: 15px;"></i><p style="color: #64748b; font-size: 15px; margin: 0;">Bạn chưa có hồ sơ bệnh án nào được hoàn thành.</p></div>';
            } else {
                let hoSoHTML = '';
                donThuocList.forEach(app => {
                    const d = new Date(app.ngay_lam_viec);
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                    const ghiChuFormat = app.ghi_chu_cua_bac_si ? app.ghi_chu_cua_bac_si.replace(/\n/g, '<br>') : '<span style="color:#94a3b8; font-style:italic;">Không có ghi chú hoặc đơn thuốc.</span>';

                    // HIỂN THỊ NÚT ĐÁNH GIÁ HOẶC SỐ SAO ĐÃ ĐÁNH GIÁ
                    let ratingHtml = '';
                    if (app.diem_danh_gia) {
                        ratingHtml = `<span class="rated-badge" style="color: #f59e0b; font-size: 14px;"><i class="fa-solid fa-star"></i> ${app.diem_danh_gia}/5 Sao</span>`;
                    } else {
                        ratingHtml = `<button class="btn-rate" onclick="openRatingModal(${app.id}, '${app.ten_bac_si}')"><i class="fa-regular fa-star"></i> Đánh giá Bác sĩ</button>`;
                    }

                    hoSoHTML += `
                        <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.04); margin-bottom: 20px; border: 1px solid #e2e8f0;">
                            <div style="background: linear-gradient(135deg, #0284c7, #0ea5e9); padding: 15px 20px; color: #fff; display: flex; justify-content: space-between; align-items: center;">
                                <h4 style="margin: 0; font-size: 16px; font-weight: 600;"><i class="fa-solid fa-file-prescription" style="margin-right: 8px;"></i> Hồ Sơ Bệnh Án & Đơn Thuốc</h4>
                                <span style="font-size: 13px; background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; font-weight: 500;"><i class="fa-regular fa-calendar-check"></i> ${dateStr}</span>
                            </div>
                            <div style="padding: 20px;">
                                <div style="display: flex; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #cbd5e1;">
                                    <div style="flex: 1;"><span style="color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Bác sĩ phụ trách</span><br><strong style="color: #0f172a; font-size: 16px; display: inline-block; margin-top: 5px;">BS. ${app.ten_bac_si}</strong></div>
                                    <div style="flex: 2;"><span style="color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Triệu chứng ban đầu</span><br><span style="color: #334155; font-size: 15px; display: inline-block; margin-top: 5px;">${app.mo_ta_trieu_chung || 'Không có'}</span></div>
                                </div>
                                <div>
                                    <span style="color: #0284c7; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;"><i class="fa-solid fa-clipboard-check"></i> Kết luận & Chỉ định</span>
                                    <div style="background: #F0F9FF; border-left: 4px solid #0284C7; padding: 15px 20px; border-radius: 0 8px 8px 0; font-size: 15px; color: #1e293b; line-height: 1.7; margin-top: 10px;">
                                        ${ghiChuFormat}
                                    </div>
                                </div>
                                <div style="margin-top: 20px; text-align: right; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                                    ${ratingHtml}
                                </div>
                            </div>
                        </div>
                    `;
                });
                containerHoSo.innerHTML = hoSoHTML; // In dữ liệu ra 1 lần duy nhất
            }
        } else {
            console.warn("⚠️ HTML bị thiếu: Không tìm thấy thẻ div nào có id='ho_so_suc_khoe_list'");
        }

    } catch (error) {
        console.error(error);
        if(containerLichSu) containerLichSu.innerHTML = '<p style="color: red; text-align: center;">Không thể tải lịch sử khám lúc này.</p>';
    }
}

// ==================================================
// 7. LOGIC ĐÁNH GIÁ SAO (RATING)
// ==================================================
let currentRatingScore = 0;
let currentRatingAppId = null;

function openRatingModal(appId, docName) {
    currentRatingAppId = appId;
    currentRatingScore = 0;
    document.getElementById('rate_doc_name').innerText = 'BS. ' + docName;
    document.getElementById('rate_comment').value = '';

    // Reset toàn bộ sao về rỗng (Màu xám)
    document.querySelectorAll('.star-rating').forEach(star => {
        star.classList.replace('fa-solid', 'fa-regular');
        star.style.color = '#cbd5e1';
    });

    openModal('ratingModal');
}

function closeRatingModal() { closeModal('ratingModal'); }

// Lắng nghe sự kiện Hover / Click chọn Sao
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.star-rating').forEach(star => {
        star.addEventListener('click', function() {
            currentRatingScore = parseInt(this.getAttribute('data-val'));
            document.querySelectorAll('.star-rating').forEach(s => {
                const val = parseInt(s.getAttribute('data-val'));
                if (val <= currentRatingScore) {
                    s.classList.replace('fa-regular', 'fa-solid');
                    s.style.color = '#f59e0b'; // Màu vàng
                } else {
                    s.classList.replace('fa-solid', 'fa-regular');
                    s.style.color = '#cbd5e1'; // Màu xám
                }
            });
        });
    });
});

async function submitRating() {
    if (currentRatingScore === 0) return Swal.fire('Lỗi', 'Vui lòng chọn số sao để đánh giá Bác sĩ!', 'warning');
    const nhan_xet = document.getElementById('rate_comment').value.trim();

    try {
        const res = await fetch(`http://localhost:3000/api/appointments/${currentRatingAppId}/rate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diem_danh_gia: currentRatingScore, nhan_xet }) });
        if (res.ok) { Swal.fire('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.', 'success'); closeRatingModal(); fetchMedicalHistory(); } 
        else { 
            const data = await res.json();
            Swal.fire('Lỗi', data.message || 'Không thể gửi đánh giá lúc này.', 'error'); 
        }
    } catch (error) { console.error(error); }
}