window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
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
    // Luôn ẩn hết sub-view (chi tiết bài viết, tất cả BS, tất cả bài viết...)
    // và khôi phục nội dung chính khi chuyển bất kỳ tab nào
    const mainHome = document.getElementById('main-home-content');
    if (mainHome) mainHome.style.display = (tabId === 'tab-trang-chu') ? 'block' : 'none';

    const subViews = ['post-detail-view', 'all-posts-view', 'all-doctors-view'];
    subViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Luôn cuộn lên đầu trang khi chuyển tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// =========================================================
// LOGIC SLIDER TRANG CHỦ
// =========================================================
let heroSlideInterval;
let isSliderAnimating = false;

function initHeroSlider() {
    const slider = document.getElementById('hero-slider');
    if (!slider) return;
    startHeroSlideInterval();
}

function moveSlide(direction) {
    if (isSliderAnimating) return;
    const slider = document.getElementById('hero-slider');
    if (!slider) return;
    
    isSliderAnimating = true;
    clearInterval(heroSlideInterval);
    
    if (direction === 1) {
        slider.style.transition = 'transform 0.8s ease-in-out';
        slider.style.transform = 'translateX(-100%)';
        setTimeout(() => {
            slider.style.transition = 'none';
            slider.appendChild(slider.firstElementChild);
            slider.style.transform = 'translateX(0)';
            isSliderAnimating = false;
            startHeroSlideInterval();
        }, 800);
    } else {
        slider.style.transition = 'none';
        slider.prepend(slider.lastElementChild);
        slider.style.transform = 'translateX(-100%)';
        slider.offsetHeight; 
        slider.style.transition = 'transform 0.8s ease-in-out';
        slider.style.transform = 'translateX(0)';
        setTimeout(() => {
            isSliderAnimating = false;
            startHeroSlideInterval();
        }, 800);
    }
}

function startHeroSlideInterval() {
    heroSlideInterval = setInterval(() => { moveSlide(1); }, 6000); // 6 giây đổi 1 lần
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
                    avatarImg.src = `${window.API_BASE}/uploads/${userInfo.anh_dai_dien}`;
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

        if (document.getElementById('pt_ngay_sinh')) {
            if (userInfo.ngay_sinh) {
                document.getElementById('pt_ngay_sinh').value = userInfo.ngay_sinh.split('T')[0];
            }
        }

        // 1. Tải danh sách câu hỏi động từ Cơ sở dữ liệu khi mở trang
        loadCommunityQA();
        
        // 2. Tải danh sách chuyên khoa động
        loadSpecialtiesForQA();

        // 3. Tải Hồ sơ sức khỏe & Lịch sử khám bệnh
        fetchMedicalHistory();

        // 4. Khởi chạy Slider
        initHeroSlider();

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
                const response = await fetch(window.API_BASE + '/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Giữ nguyên ID thật để tránh lỗi NOT NULL trong CSDL.
                        // Đánh dấu ẩn danh bằng cách thêm tiền tố vào tiêu đề
                        benh_nhan_id: userInfo.id,
                        tieu_de: isAnDanh ? `[Ẩn danh] ${tieuDe}` : tieuDe,
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
window.currentQAKeyword = ''; // Trạng thái lọc theo từ khóa
window.currentPage = 1; // Trang hiện tại
window.itemsPerPage = 5; // Số lượng câu hỏi mỗi trang

async function loadCommunityQA() {
    try {
        // Thêm timestamp để chống trình duyệt lưu Cache cũ
        const res = await fetch(`${window.API_BASE}/api/questions?t=${new Date().getTime()}`);
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
            
            // 3. Lọc theo Từ khóa (Tìm trong tiêu đề, nội dung và ngày)
            let matchKeyword = true;
            if (window.currentQAKeyword) {
                const title = (q.tieu_de || '').toLowerCase();
                const content = (q.noi_dung || '').toLowerCase();
                
                const date = new Date(q.ngay_tao || Date.now());
                const dateString = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                
                matchKeyword = title.includes(window.currentQAKeyword) || content.includes(window.currentQAKeyword) || dateString.includes(window.currentQAKeyword);
            }
            
            return matchSpecialty && matchStatus && matchKeyword;
        });

        let countEl = document.getElementById('qa_count');
        if(countEl) countEl.innerText = filteredQuestions.length;

        if (filteredQuestions.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #64748B; padding: 20px 0;">Không có câu hỏi nào phù hợp với bộ lọc hiện tại.</p>';
            const paginationContainer = document.getElementById('qa_pagination');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        // Thuật toán Phân trang
        const totalItems = filteredQuestions.length;
        const totalPages = Math.ceil(totalItems / window.itemsPerPage);
        
        if (window.currentPage > totalPages) window.currentPage = totalPages;
        if (window.currentPage < 1) window.currentPage = 1;

        const startIndex = (window.currentPage - 1) * window.itemsPerPage;
        const endIndex = startIndex + window.itemsPerPage;
        const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

        let qaHTML = '';
        paginatedQuestions.forEach(q => {
            const date = new Date(q.ngay_tao || Date.now());
            const dateString = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            // Kiểm tra xem câu hỏi có ẩn danh không (Dựa vào tiền tố trong tiêu đề)
            let isAnDanh = false;
            let displayTieuDe = q.tieu_de || 'Câu hỏi';
            
            if (displayTieuDe.startsWith('[Ẩn danh]')) {
                isAnDanh = true;
                displayTieuDe = displayTieuDe.replace('[Ẩn danh] ', '').replace('[Ẩn danh]', '');
            } else if (!q.nguoi_hoi || q.nguoi_hoi.trim() === '') {
                isAnDanh = true;
            }

            const tenNguoiHoi = isAnDanh ? "Ẩn danh" : q.nguoi_hoi;
            const avatarContent = isAnDanh ? '<i class="fa-solid fa-user-secret" style="font-size: 15px;"></i>' : tenNguoiHoi.charAt(0).toUpperCase();
            
            const statusBadge = q.trang_thai || q.tra_loi 
                ? `<span class="qa-badge" style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã trả lời</span>` 
                : `<span class="qa-badge qa-pending" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Chờ phản hồi</span>`;

            const nguoiDaTraLoi = q.ten_nguoi_tra_loi ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? 'Quản trị viên' : `BS. ${q.ten_nguoi_tra_loi}`) : 'Bác sĩ';
            
            // Tóm tắt nội dung tránh làm vỡ giao diện thẻ
            const noiDungSummary = q.noi_dung ? q.noi_dung.replace(/\n/g, ' ') : '';
            const traLoiSummary = q.tra_loi ? q.tra_loi.replace(/\n/g, ' ') : '';

            const answerHtml = q.tra_loi 
                ? `<div style="margin-top: 15px; padding: 12px; background: #F0F9FF; border-left: 4px solid #0284C7; border-radius: 4px;">
                     <strong style="color: #0284c7;">${nguoiDaTraLoi} trả lời:</strong> <p class="text-clamp-2" style="margin: 5px 0 0 0; color: #334155; font-size: 14px;">${traLoiSummary}</p>
                   </div>` 
                : '';

            // Mã hóa dữ liệu truyền vào hàm onClick để tránh lỗi vỡ chuỗi do dấu nháy kép / nháy đơn
            const tieuDeEncoded = encodeURIComponent(displayTieuDe);
            const noiDungEncoded = encodeURIComponent(q.noi_dung || '');
            const traLoiEncoded = encodeURIComponent(q.tra_loi || '');
            const nguoiTraLoiEncoded = encodeURIComponent(nguoiDaTraLoi);
            const popupArgs = `decodeURIComponent('${tieuDeEncoded}'), decodeURIComponent('${noiDungEncoded}'), decodeURIComponent('${traLoiEncoded}'), decodeURIComponent('${nguoiTraLoiEncoded}')`;

            qaHTML += `
                <div class="qa-card" style="animation: fadeIn 0.5s; cursor: pointer; word-break: break-word;" onclick="openQADetailPopup(${popupArgs})" title="Nhấn để xem chi tiết">
                    <div class="qa-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="qa-user-info" style="display:flex; align-items:center; gap: 10px;">
                            <div class="qa-avatar" style="background: #e2e8f0; color: #475569; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:bold;">${avatarContent}</div>
                            <div class="qa-meta" style="font-size: 13px; color: #64748B;">
                                <span class="qa-name" style="font-weight:bold; color:#0F172A;">${tenNguoiHoi}</span> • 
                                <span class="qa-date">${dateString}</span>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                    <h3 class="qa-title text-clamp-2" style="margin-top: 15px; font-size: 16px; color: #0F172A;">${displayTieuDe}</h3>
                    <p class="qa-desc text-clamp-3" style="color: #475569; font-size: 14px; margin-top: 5px; margin-bottom: 0;">${noiDungSummary}</p>
                    ${answerHtml}
                </div>
            `;
        });
        // Gán 1 lần duy nhất để chống lỗi vòng lặp
        list.innerHTML = qaHTML;

        // Hiển thị nút phân trang
        renderPagination(totalPages);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỏi đáp:', error);
    }
}

// ==================================================
// HÀM MỞ POPUP CHI TIẾT CÂU HỎI TRONG GIAO DIỆN BỆNH NHÂN
// ==================================================
function openQADetailPopup(tieuDe, noiDung, traLoi, nguoiTraLoi) {
    let answerHtml = '';
    if (traLoi && traLoi.trim() !== '') {
        answerHtml = `
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 15px;">
                <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600;"><i class="fa-solid fa-user-doctor"></i> ${nguoiTraLoi} giải đáp:</p>
                <p style="margin: 0;">${traLoi.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }

    Swal.fire({
        title: tieuDe,
        html: `
            <div style="text-align: left; font-size: 15px; color: #334155; line-height: 1.6; word-break: break-word;">
                <p style="margin-bottom: 15px;"><strong>Câu hỏi:</strong><br>${noiDung.replace(/\n/g, '<br>')}</p>
                ${answerHtml}
            </div>
        `,
        width: '600px',
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#0284c7'
    });
}

// ==================================================
// HÀM HIỂN THỊ NÚT PHÂN TRANG (PAGINATION)
// ==================================================
function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('qa_pagination');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    
    if (window.currentPage > 1) {
        html += `<button class="qa-page-btn" onclick="changeQAPage(${window.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === window.currentPage) {
            html += `<button class="qa-page-btn active" onclick="changeQAPage(${i})">${i}</button>`;
        } else {
            html += `<button class="qa-page-btn" onclick="changeQAPage(${i})">${i}</button>`;
        }
    }

    if (window.currentPage < totalPages) {
        html += `<button class="qa-page-btn" onclick="changeQAPage(${window.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeQAPage(page) {
    window.currentPage = page;
    renderCommunityQA();
    // Tự động cuộn lên đầu danh sách câu hỏi
    const qaFeed = document.querySelector('.qa-main-feed');
    if (qaFeed) {
        const y = qaFeed.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

// ==================================================
// LOAD DANH SÁCH CHUYÊN KHOA CHO HỎI ĐÁP
// ==================================================
async function loadSpecialtiesForQA() {
    try {
        const res = await fetch(window.API_BASE + '/api/specialties');
        if (!res.ok) throw new Error('Lỗi khi tải chuyên khoa');
        const specialties = await res.json();

        // Lấy danh sách bác sĩ để lọc
        const resDoc = await fetch(window.API_BASE + '/api/doctors');
        let activeDoctorSpecialtyIds = new Set();
        if (resDoc.ok) {
            const doctors = await resDoc.json();
            // Lưu ID của những chuyên khoa đang có Bác sĩ hoạt động (trang_thai = 1)
            doctors.forEach(doc => {
                if (doc.trang_thai == 1 && doc.chuyen_khoa_id) {
                    activeDoctorSpecialtyIds.add(doc.chuyen_khoa_id);
                }
            });
        }

        // Lọc danh sách chuyên khoa (chỉ lấy những khoa hiện có bác sĩ)
        const availableSpecialties = specialties.filter(sp => activeDoctorSpecialtyIds.has(sp.id));

        // 1. Đổ dữ liệu vào select box (Dropdown)
        const selectEl = document.getElementById('qa_chuyen_khoa');
        if (selectEl) {
            selectEl.innerHTML = '<option value="">Chọn chuyên khoa</option>';
            if (availableSpecialties.length === 0) {
                selectEl.innerHTML += '<option value="" disabled>Hiện chưa có bác sĩ nào tiếp nhận câu hỏi</option>';
            } else {
                availableSpecialties.forEach(sp => {
                    selectEl.innerHTML += `<option value="${sp.id}">${sp.ten_chuyen_khoa}</option>`;
                });
            }
        }

        // 2. Đổ dữ liệu vào các pill lọc (Nút bấm)
        const pillsContainer = document.getElementById('qa_filter_pills');
        if (pillsContainer) {
            pillsContainer.innerHTML = `<button class="qa-pill active" onclick="filterQABySpecialty('all', this)">Tất cả</button>`;
            availableSpecialties.forEach(sp => {
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
    window.currentPage = 1;
    renderCommunityQA();
}

// HÀM KÍCH HOẠT KHI CHỌN DROPDOWN TRẠNG THÁI
function filterQAByStatus(status) {
    window.currentQAStatus = status;
    window.currentPage = 1;
    renderCommunityQA();
}

// HÀM KÍCH HOẠT KHI NHẬP TỪ KHÓA
function filterQABySearch() {
    window.currentQAKeyword = document.getElementById('qa_search_keyword').value.toLowerCase().trim();
    window.currentPage = 1;
    renderCommunityQA();
}

// HÀM RESET THANH TÌM KIẾM
function resetQASearch() {
    document.getElementById('qa_search_keyword').value = '';
    filterQABySearch(); // Tự động gọi lại hàm trên để clear state và render lại
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
    Swal.fire('Thông báo', 'Hồ sơ cá nhân không được phép tự ý chỉnh sửa sau khi đăng ký để đảm bảo tính xác thực. Nếu cần thay đổi thông tin, vui lòng liên hệ Admin.', 'info');
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

window.patientAppointments = []; // Lưu trữ tạm thời lịch sử khám để dùng cho nút Sửa Đánh giá

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
        const res = await fetch(`${window.API_BASE}/api/appointments/patient/${userInfo.id}?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const history = await res.json();
        
        window.patientAppointments = history;

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
                        ratingHtml = `
                            <span class="rated-badge" style="color: #f59e0b; font-size: 14px; margin-right: 15px;"><i class="fa-solid fa-star"></i> ${app.diem_danh_gia}/5 Sao</span>
                            <button onclick="editRating(${app.danh_gia_id})" style="background: none; border: none; color: #0284c7; cursor: pointer; font-size: 13px; font-weight: 600;"><i class="fa-solid fa-pen"></i> Sửa đánh giá</button>
                        `;
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
let currentReviewId = null;

function openRatingModal(appId, docName) {
    currentRatingAppId = appId;
    currentReviewId = null; // Đặt lại ID Đánh giá (Báo hiệu đây là Thêm Mới)
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

function editRating(reviewId) {
    const app = window.patientAppointments.find(a => a.danh_gia_id === reviewId);
    if (!app) return;
    
    currentReviewId = reviewId;
    currentRatingAppId = null;
    currentRatingScore = app.diem_danh_gia;
    
    document.getElementById('rate_doc_name').innerText = 'BS. ' + app.ten_bac_si;
    document.getElementById('rate_comment').value = app.nhan_xet || '';

    // Hiển thị số sao cũ
    document.querySelectorAll('.star-rating').forEach(s => {
        const val = parseInt(s.getAttribute('data-val'));
        if (val <= currentRatingScore) {
            s.classList.replace('fa-regular', 'fa-solid');
            s.style.color = '#f59e0b';
        } else {
            s.classList.replace('fa-solid', 'fa-regular');
            s.style.color = '#cbd5e1';
        }
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
        let res;
        if (currentReviewId) {
            // Gọi API Sửa Đánh Giá
            res = await fetch(`${window.API_BASE}/api/reviews/${currentReviewId}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ so_sao: currentRatingScore, noi_dung: nhan_xet }) 
            });
        } else {
            // Gọi API Thêm Đánh Giá Mới
            res = await fetch(`${window.API_BASE}/api/appointments/${currentRatingAppId}/rate`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ diem_danh_gia: currentRatingScore, nhan_xet }) 
            });
        }
        
        if (res.ok) { 
            Swal.fire('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.', 'success'); 
            closeRatingModal(); 
            fetchMedicalHistory(); 
        } else { 
            let errorMessage = 'Không thể gửi đánh giá lúc này.';
            try {
                const data = await res.json();
                errorMessage = data.message || errorMessage;
            } catch (parseError) {
                errorMessage = 'Lỗi 404: API không tồn tại. Vui lòng khởi động lại server Backend!';
            }
            Swal.fire('Lỗi', errorMessage, 'error'); 
        }
    } catch (error) { console.error(error); }
}

/* =========================================================================================
   KHỞI TẠO MENU MOBILE CHUẨN (GIỮ NGUYÊN 100% GIAO DIỆN MÁY TÍNH) - BỆNH NHÂN
========================================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.querySelector('.patient-nav .container') || document.querySelector('.navbar .container');
    const navLinks = document.querySelector('.nav-links');
    
    // Tìm thẻ bọc Avatar và Tên bệnh nhân (Hỗ trợ quét đa dạng các class)
    let userMenu = document.querySelector('.user-menu') || document.querySelector('.user-dropdown-btn') || document.querySelector('.user-profile') || document.querySelector('.auth-buttons');
    if (!userMenu) {
        const avatarImg = document.getElementById('nav_patient_img');
        if (avatarImg) userMenu = avatarImg.parentElement; // Lấy thẻ bọc trực tiếp của ảnh
    }
    
    if (navbarContainer && navLinks) {
        let mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        // 1. TẠO NÚT 3 GẠCH (Chỉ hiện trên điện thoại qua CSS)
        if (!mobileMenuBtn) {
            mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            navbarContainer.appendChild(mobileMenuBtn);
        }
        
        // 2. TẠO MENU CLONE RIÊNG CHO ĐIỆN THOẠI (Không đụng chạm code Máy tính)
        let mobileDrawer = document.querySelector('.mobile-drawer');
        if (!mobileDrawer) {
            mobileDrawer = document.createElement('div');
            mobileDrawer.className = 'mobile-drawer';
            
            const btnClose = document.createElement('button');
            btnClose.className = 'close-menu-btn';
            btnClose.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            mobileDrawer.appendChild(btnClose);
            
            // Nhân bản (Clone) Menu và Avatar để nhét vào Drawer
            const clonedNav = navLinks.cloneNode(true);
            clonedNav.className = 'mobile-nav-links';
            mobileDrawer.appendChild(clonedNav);
            
            if (userMenu) {
                const clonedUser = userMenu.cloneNode(true);
                clonedUser.className = 'mobile-user-btn';
                clonedUser.removeAttribute('id'); // Tránh trùng lặp ID
                
                // Bê nguyên xi menu xổ xuống của máy tính, thêm sự kiện click để mở/đóng
                clonedUser.addEventListener('click', function(e) {
                    // Nếu bấm vào nút bên trong (VD: Đăng xuất) thì không toggle nữa
                    if(e.target.tagName.toLowerCase() !== 'a' && e.target.closest('a') === null) {
                        e.preventDefault();
                        this.classList.toggle('active');
                    }
                });
                
                // Tự động đóng Ngăn kéo khi bấm Đăng xuất hoặc các mục trong Dropdown
                clonedUser.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', () => {
                        document.querySelector('.mobile-drawer').classList.remove('active');
                    });
                });
                
                mobileDrawer.appendChild(clonedUser);
            }
            
            document.body.appendChild(mobileDrawer);
        }
        
        // 3. GẮN SỰ KIỆN BẤM MỞ / ĐÓNG MENU TRÊN ĐIỆN THOẠI
        const closeBtnElem = document.querySelector('.mobile-drawer .close-menu-btn');
        mobileMenuBtn.addEventListener('click', () => { document.querySelector('.mobile-drawer').classList.add('active'); });
        if (closeBtnElem) closeBtnElem.addEventListener('click', () => { document.querySelector('.mobile-drawer').classList.remove('active'); });
        
        // 4. TỰ ĐỘNG ĐÓNG MENU VÀ CHUYỂN TAB KHI BẤM CHỌN
        document.querySelectorAll('.mobile-nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelector('.mobile-drawer').classList.remove('active');
                const onclickAttr = link.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes("switchTab")) {
                    const match = onclickAttr.match(/'([^']+)'/);
                    if (match && match[1]) {
                        switchTab(e, match[1]);
                    }
                }
            });
        });
    }
});

/* =========================================================================================
   BẢO VỆ GIAO DIỆN HỒ SƠ BỆNH NHÂN TRÊN MOBILE (ÉP 1 CỘT - ĐẢO VỊ TRÍ)
========================================================================================= */
function enforceMobileProfileLayout() {
    const ptTen = document.getElementById('pt_ten');
    const lichSuKham = document.getElementById('lich_su_kham_list');
    
    if (ptTen && lichSuKham) {
        let col1 = ptTen;
        let col2 = lichSuKham;
        
        let parent = col1.parentElement;
        while (parent && !parent.contains(col2) && parent !== document.body) {
            col1 = parent;
            parent = parent.parentElement;
        }
        
        if (parent && parent !== document.body) {
            let actualCol2 = col2;
            while (actualCol2.parentElement && actualCol2.parentElement !== parent) {
                actualCol2 = actualCol2.parentElement;
            }

            if (window.innerWidth <= 768) {
                // TRÊN ĐIỆN THOẠI: Ép thành 1 cột dọc và đảo vị trí
                parent.style.setProperty('display', 'flex', 'important');
                parent.style.setProperty('flex-direction', 'column-reverse', 'important');
                parent.style.setProperty('gap', '30px', 'important');
                parent.style.setProperty('width', '100%', 'important');
                
                col1.style.setProperty('width', '100%', 'important');
                col1.style.setProperty('max-width', '100%', 'important');
                col1.style.setProperty('flex', 'none', 'important');
                
                actualCol2.style.setProperty('width', '100%', 'important');
                actualCol2.style.setProperty('max-width', '100%', 'important');
                actualCol2.style.setProperty('flex', 'none', 'important');
                
                lichSuKham.style.setProperty('width', '100%', 'important');
                lichSuKham.style.setProperty('display', 'block', 'important');
            } else {
                // TRÊN MÁY TÍNH: Xóa bỏ mọi sự can thiệp của JavaScript, trả lại giao diện 50/50 nguyên gốc
                parent.style.display = '';
                parent.style.flexDirection = '';
                parent.style.gap = '';
                parent.style.width = '';
                
                col1.style.width = '';
                col1.style.maxWidth = '';
                col1.style.flex = '';
                
                actualCol2.style.width = '';
                actualCol2.style.maxWidth = '';
                actualCol2.style.flex = '';
                
                lichSuKham.style.width = '';
                lichSuKham.style.display = '';
            }
        }
    }
}

// Chạy hàm ngay khi vừa tải trang và khi người dùng xoay ngang/dọc điện thoại
document.addEventListener('DOMContentLoaded', () => { setTimeout(enforceMobileProfileLayout, 500); });
window.addEventListener('resize', enforceMobileProfileLayout);


