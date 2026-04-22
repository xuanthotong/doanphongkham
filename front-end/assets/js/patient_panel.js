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

        // Cập nhật Form Hồ sơ cá nhân (CHỈ ĐỂ XEM)
        if (document.getElementById('pt_ten')) document.getElementById('pt_ten').value = userInfo.ho_ten || "Chưa cập nhật";
        if (document.getElementById('pt_sdt')) document.getElementById('pt_sdt').value = userInfo.so_dien_thoai || "Chưa cập nhật";
        if (document.getElementById('pt_email')) document.getElementById('pt_email').value = userInfo.email || "Chưa cập nhật";
        if (document.getElementById('pt_dia_chi')) document.getElementById('pt_dia_chi').value = userInfo.dia_chi || "Chưa cập nhật";
        if (document.getElementById('pt_gioi_tinh')) {
            document.getElementById('pt_gioi_tinh').value = userInfo.gioi_tinh || "Chưa cập nhật";
        }

    } else {
        // Chưa đăng nhập -> Trở về trang chủ
        window.location.href = '../../index.html'; 
    }
});

// ==================================================
// 3. GỬI CÂU HỎI & RENDER VÀO GIAO DIỆN (CHUẨN VERCEL)
// ==================================================
function submitQuestion(e) {
    e.preventDefault();
    
    const chuyenKhoa = document.getElementById('qa_chuyen_khoa').value;
    const tieuDe = document.getElementById('qa_tieu_de').value;
    const noiDung = document.getElementById('qa_noi_dung').value;
    const isAnDanh = document.getElementById('qa_an_danh').checked; 

    // Kiểm tra tên người dùng từ bộ nhớ
    let tenNguoiHoi = "Khách ẩn danh";
    let chuCaiDau = "K";
    if (!isAnDanh) {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        tenNguoiHoi = userInfo.ho_ten || userInfo.ten_dang_nhap || "Bệnh nhân";
        chuCaiDau = tenNguoiHoi.charAt(0).toUpperCase();
    }

    const today = new Date();
    const dateString = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    Swal.fire({
        title: 'Xác nhận gửi?',
        text: isAnDanh ? "Câu hỏi sẽ được hiển thị ẩn danh." : "Câu hỏi sẽ được gửi kèm tên của bạn.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Gửi ngay',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#0284C7'
    }).then((result) => {
        if (result.isConfirmed) {
            const list = document.getElementById('community_qa_list');
            
            const html = `
                <div class="qa-card" style="animation: fadeIn 0.5s;">
                    <div class="qa-card-header">
                        <div class="qa-user-info">
                            <div class="qa-avatar" style="background: #e2e8f0; color: #475569;">${chuCaiDau}</div>
                            <div class="qa-meta">
                                <span class="qa-name">${tenNguoiHoi}</span> <span class="qa-dot">•</span>
                                <span class="qa-category">${chuyenKhoa}</span> <span class="qa-dot">•</span>
                                <span class="qa-date">${dateString}</span>
                            </div>
                        </div>
                        <span class="qa-badge qa-pending">Vừa gửi</span>
                    </div>
                    <h3 class="qa-title">${tieuDe}</h3>
                    <p class="qa-desc">${noiDung}</p>
                    <div class="qa-card-footer">
                        <span><i class="fa-regular fa-comment"></i> 0 câu trả lời</span>
                    </div>
                </div>
            `;
            
            // Chèn lên đầu
            list.insertAdjacentHTML('afterbegin', html);
            
            // Tăng biến đếm câu hỏi
            let countEl = document.getElementById('qa_count');
            if(countEl) countEl.innerText = parseInt(countEl.innerText) + 1;

            // Reset form
            document.getElementById('qaForm').reset();
            Swal.fire('Hoàn tất!', 'Câu hỏi đã được gửi thành công. Bác sĩ sẽ phản hồi sớm nhất.', 'success');
        }
    });
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