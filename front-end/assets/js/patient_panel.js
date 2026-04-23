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
                avatarImg.src = `http://localhost:3000/uploads/${userInfo.anh_dai_dien}`;
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
                        benh_nhan_id: userInfo.id,
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
        const res = await fetch('http://localhost:3000/api/questions');
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

        filteredQuestions.forEach(q => {
            const date = new Date(q.ngay_tao || Date.now());
            const dateString = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            const tenNguoiHoi = q.nguoi_hoi || "Bệnh nhân";
            const chuCaiDau = tenNguoiHoi.charAt(0).toUpperCase();
            
            const statusBadge = q.trang_thai || q.tra_loi 
                ? `<span class="qa-badge" style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã trả lời</span>` 
                : `<span class="qa-badge qa-pending" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Chờ phản hồi</span>`;

            const answerHtml = q.tra_loi 
                ? `<div style="margin-top: 15px; padding: 12px; background: #F0F9FF; border-left: 4px solid #0284C7; border-radius: 4px;">
                     <strong>Bác sĩ trả lời:</strong> <p style="margin: 5px 0 0 0; color: #334155; font-size: 14px;">${q.tra_loi}</p>
                   </div>` 
                : '';

            list.innerHTML += `
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
                localStorage.clear(); 
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

    const ho_ten = document.getElementById('pt_ten').value.trim();
    const so_dien_thoai = document.getElementById('pt_sdt').value.trim();
    const dia_chi = document.getElementById('pt_dia_chi').value.trim();
    const gioi_tinh = document.getElementById('pt_gioi_tinh').value; // Đảm bảo input này trả về 1 hoặc 0 (Nam/Nữ)

    try {
        // Gọi API PUT để cập nhật bảng HoSoNguoiDung
        const response = await fetch(`http://localhost:3000/api/accounts/profile/${userInfo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ho_ten, so_dien_thoai, dia_chi, gioi_tinh })
        });

        if (response.ok) {
            Swal.fire('Thành công!', 'Cập nhật hồ sơ thành công!', 'success');
            // Cập nhật lại dữ liệu đang lưu ảo trong LocalStorage
            userInfo.ho_ten = ho_ten;
            userInfo.so_dien_thoai = so_dien_thoai;
            userInfo.dia_chi = dia_chi;
            userInfo.gioi_tinh = parseInt(gioi_tinh);
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // Cập nhật lại tên trên Navbar ngay lập tức
            const elPatientName = document.getElementById('patientName');
            if (elPatientName) elPatientName.innerText = ho_ten || userInfo.ten_dang_nhap;
            
        } else {
            const errData = await response.json();
            Swal.fire('Lỗi!', errData.message || 'Không thể cập nhật hồ sơ.', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
    }
}