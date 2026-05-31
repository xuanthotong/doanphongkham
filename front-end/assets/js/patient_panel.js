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
    if (e) e.preventDefault();
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

window.onclick = function (event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showContactOptions(e) {
    if (e) e.preventDefault();
    Swal.fire({
        title: 'Liên hệ Hỗ trợ',
        html: `
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                <a href="https://www.facebook.com/tongtho308" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; background: #1877F2; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    <i class="fa-brands fa-facebook" style="font-size: 20px;"></i> Facebook của Tống Thọ
                </a>
                <a href="https://www.facebook.com/nguyen.thieu.983134" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; background: #1877F2; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    <i class="fa-brands fa-facebook" style="font-size: 20px;"></i> Facebook của Nguyễn Thiệu
                </a>
                <a href="tel:19006868" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    <i class="fa-solid fa-phone" style="font-size: 20px;"></i> Gọi điện Hotline 1900 6868
                </a>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: '400px'
    });
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
        const elPatientId = document.getElementById('patientIdDisplay');
        if (elPatientId && userInfo.id) {
            const formattedId = '#BN' +
                userInfo.id.toString().padStart(5, '0');
            elPatientId.innerText = formattedId;
        }
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
                avatarImg.onerror = function () { this.src = fallbackAvatar; };
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
        if (countEl) countEl.innerText = filteredQuestions.length;

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
        window.scrollTo({ top: y, behavior: 'smooth' });
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
    if (event) event.preventDefault();
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
    if (event) event.preventDefault();
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
        // TÍNH TOÁN CÁC CHỈ SỐ DASHBOARD THỰC TẾ
        // ===========================================
        let totalVisits = history.length;
        let donThuocList = history.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'done');
        let totalPrescriptions = donThuocList.length;

        let upcomingList = history.filter(app => {
            const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
            return status === 'pending' || status === 'approved';
        });
        let totalUpcoming = upcomingList.length;

        // Đếm số lượng bác sĩ đã gặp (Dựa trên tên bác sĩ)
        let uniqueDoctors = new Set();
        donThuocList.forEach(app => {
            if (app.ten_bac_si) uniqueDoctors.add(app.ten_bac_si);
        });
        let totalDoctors = uniqueDoctors.size;

        // Cập nhật DOM Dashboard
        const updatePatientStatCard = (id, count, action) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = count;
                const card = el.closest('.stat-card');
                if (card) {
                    card.style.cursor = 'pointer';
                    card.onclick = action;
                }
            }
        };

        updatePatientStatCard('stat-total-visits', totalVisits, (e) => {
            scrollToSection('btn-tab-history', e);
            switchProfileTab('history');
        });

        updatePatientStatCard('stat-total-prescriptions', totalPrescriptions, (e) => {
            scrollToSection('btn-tab-record', e);
            switchProfileTab('record');
        });

        updatePatientStatCard('stat-upcoming-appointments', totalUpcoming, (e) => {
            scrollToSection('btn-tab-history', e);
            switchProfileTab('history');
        });

        updatePatientStatCard('stat-doctors-visited', totalDoctors, async (e) => {
            if (uniqueDoctors.size === 0) {
                Swal.fire('Thông báo', 'Bạn chưa có lịch sử khám bệnh nào nên chưa có bác sĩ đã gặp.', 'info');
                return;
            }

            try {
                const res = await fetch(`${window.API_BASE}/api/doctors`);
                const doctorsList = await res.json();

                const visitedDocs = doctorsList.filter(d => uniqueDoctors.has(d.ho_ten) || uniqueDoctors.has(d.ten_dang_nhap));

                if (visitedDocs.length > 0) {
                    let html = '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">';
                    visitedDocs.forEach(doc => {
                        const displayName = doc.ho_ten || doc.ten_dang_nhap || 'Bác sĩ';
                        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
                        let imgSrc = doc.anh_dai_dien && doc.anh_dai_dien.trim() !== "" ? doc.anh_dai_dien : defaultImg;
                        if (!imgSrc.startsWith('http') && !imgSrc.startsWith('data:image')) imgSrc = `${window.API_BASE}/uploads/${imgSrc}`;

                        html += `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <img src="${imgSrc}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #fff;" onerror="this.src='${defaultImg}'">
                                    <div style="text-align: left;">
                                        <div style="font-weight: 700; color: #0f172a; font-size: 15px;">BS. ${displayName}</div>
                                        <div style="font-size: 13px; color: #64748b;">${doc.ten_chuyen_khoa || 'Chưa cập nhật'}</div>
                                    </div>
                                </div>
                                <button onclick="Swal.close(); if(typeof switchTab === 'function') switchTab(null, 'tab-dat-lich'); setTimeout(() => { const btn = document.getElementById('bdc-toggle-${doc.id}'); if(btn && !btn.classList.contains('active-toggle')) btn.click(); if(btn) setTimeout(() => btn.scrollIntoView({behavior: 'smooth', block: 'center'}), 200); }, 400)" style="padding: 8px 15px; border-radius: 8px; background: #0284c7; color: white; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s;">Khám lại</button>
                            </div>
                        `;
                    });
                    html += '</div>';
                    Swal.fire({ title: 'Danh sách Bác sĩ đã gặp', html: html, showConfirmButton: false, showCloseButton: true, width: '500px' });
                } else {
                    Swal.fire('Thông báo', 'Chưa có thông tin chi tiết của các Bác sĩ bạn đã gặp.', 'info');
                }
            } catch (err) {
                console.error('Lỗi khi fetch bác sĩ:', err);
                Swal.fire('Lỗi', 'Không thể lấy dữ liệu bác sĩ.', 'error');
            }
        });

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
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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

                    // HIỆN NÚT XEM PHIẾU KHÁM + HỦY LỊCH NẾU LỊCH CHƯA KHÁM XONG
                    let btnXemPhieu = '';
                    if (status === 'pending' || status === 'approved') {
                        btnXemPhieu = `<div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button onclick="viewAppointmentTicket(${app.id})" style="padding: 8px 16px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; transition: 0.2s; box-shadow: 0 2px 5px rgba(14, 165, 233, 0.2);" onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'"><i class="fa-solid fa-ticket"></i> Xem & Tải Phiếu Khám</button>
                            <button onclick="patientCancelAppointment(${app.id})" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; transition: 0.2s; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.2);" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'"><i class="fa-solid fa-ban"></i> Hủy lịch hẹn</button>
                        </div>`;
                    }

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
                                ${btnXemPhieu}
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
                // Fetch đơn thuốc cho tất cả lịch khám đã Done
                const prescriptionPromises = donThuocList.map(app =>
                    fetch(`${window.API_BASE}/api/don-thuoc/${app.id}`)
                        .then(r => r.ok ? r.json() : [])
                        .catch(() => [])
                );
                const allPrescriptions = await Promise.all(prescriptionPromises);

                donThuocList.forEach((app, idx) => {
                    const d = new Date(app.ngay_lam_viec);
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    
                    // Lấy chẩn đoán từ ghi chú
                    let chanDoan = app.ghi_chu_cua_bac_si || '';
                    if (chanDoan.includes("Chẩn đoán:")) {
                        chanDoan = chanDoan.replace("Chẩn đoán:", "").split("\n\nĐơn thuốc:")[0].trim();
                    }
                    const chanDoanHtml = chanDoan || '<span style="color:#94a3b8; font-style:italic;">Không có chẩn đoán.</span>';

                    // Render đơn thuốc dạng bảng từ API
                    const prescriptions = allPrescriptions[idx] || [];
                    let donThuocHtml = '';
                    if (prescriptions.length > 0) {
                        let tongTien = 0;
                        let rows = prescriptions.map((dt, i) => {
                            const thanhTien = (parseFloat(dt.gia_thuoc) || 0) * (dt.so_luong || 1);
                            tongTien += thanhTien;
                            return `<tr>
                                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${i + 1}</td>
                                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${dt.ten_thuoc} <span style="color:#64748b; font-weight:400; font-size:12px;">(${dt.don_vi})</span></td>
                                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #0284c7;">${dt.so_luong}</td>
                                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${dt.lieu_dung || '-'}</td>
                                <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${Number(thanhTien).toLocaleString('vi-VN')}đ</td>
                            </tr>`;
                        }).join('');

                        donThuocHtml = `
                            <div style="margin-top: 20px;">
                                <span style="color: #10b981; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;"><i class="fa-solid fa-pills"></i> Đơn thuốc</span>
                                <div style="margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <thead style="background: #f1f5f9;">
                                            <tr>
                                                <th style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-weight: 600; width: 40px;">STT</th>
                                                <th style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Tên thuốc</th>
                                                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-weight: 600; width: 50px;">SL</th>
                                                <th style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Liều dùng</th>
                                                <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-weight: 600; width: 100px;">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                        <tfoot>
                                            <tr style="background: #f0fdf4;">
                                                <td colspan="4" style="padding: 10px 12px; font-weight: 700; color: #166534; text-align: right;">Tổng tiền thuốc:</td>
                                                <td style="padding: 10px 8px; font-weight: 700; color: #166534; text-align: right;">${Number(tongTien).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        `;
                    } else {
                        donThuocHtml = '<div style="margin-top: 15px; padding: 12px 15px; background: #f8fafc; border-radius: 8px; color: #94a3b8; font-style: italic; font-size: 14px;"><i class="fa-solid fa-pills" style="margin-right: 6px;"></i>Bác sĩ không kê đơn thuốc.</div>';
                    }

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
                                    <span style="color: #0284c7; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;"><i class="fa-solid fa-clipboard-check"></i> Chẩn đoán</span>
                                    <div style="background: #F0F9FF; border-left: 4px solid #0284C7; padding: 15px 20px; border-radius: 0 8px 8px 0; font-size: 15px; color: #1e293b; line-height: 1.7; margin-top: 10px;">
                                        ${chanDoanHtml}
                                    </div>
                                </div>
                                ${donThuocHtml}
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


        // ===========================================
        // 3. XỬ LÝ THÔNG BÁO (NOTIFICATIONS)
        // ===========================================
        processNotifications(history);

    } catch (error) {
        console.error(error);
        if (containerLichSu) containerLichSu.innerHTML = '<p style="color: red; text-align: center;">Không thể tải lịch sử khám lúc này.</p>';
    }
}

// ==================================================
// HÀM BỆNH NHÂN TỰ HỦY LỊCH HẸN
// ==================================================
async function patientCancelAppointment(appId) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) {
        Swal.fire('Lỗi', 'Vui lòng đăng nhập lại!', 'error');
        return;
    }

    // Bước 1: Xác nhận hủy lần đầu
    const confirmResult = await Swal.fire({
        title: 'Xác nhận hủy lịch',
        text: `Bạn có chắc chắn muốn hủy lịch hẹn #LK${appId} không?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý hủy',
        cancelButtonText: 'Giữ lịch'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        // Gọi API lần 1: Kiểm tra trạng thái thanh toán
        const res = await fetch(`${window.API_BASE}/api/appointments/${appId}/patient-cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ benh_nhan_id: userInfo.id })
        });

        const data = await res.json();

        // Trường hợp: Đã thanh toán online → Backend yêu cầu xác nhận mất phí
        if (data.requireConfirm) {
            const soTienFormat = Number(data.soTien).toLocaleString('vi-VN');
            const confirmLoseFee = await Swal.fire({
                title: '⚠️ Cảnh báo mất phí!',
                html: `
                    <div style="text-align: left; font-size: 15px; line-height: 1.8; color: #334155;">
                        <p>Lịch hẹn này đã được <strong style="color: #10b981;">thanh toán online</strong>.</p>
                        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 16px;">
                                <i class="fa-solid fa-money-bill-wave"></i> Phí khám: ${soTienFormat} VNĐ
                            </p>
                            <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px;">
                                Nếu hủy, bạn sẽ <strong>KHÔNG được hoàn lại</strong> số tiền đã thanh toán.
                            </p>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">Bạn có chắc chắn muốn hủy và chấp nhận mất phí không?</p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#10b981',
                confirmButtonText: '<i class="fa-solid fa-ban"></i> Đồng ý mất phí, hủy lịch',
                cancelButtonText: '<i class="fa-solid fa-shield-halved"></i> Giữ lại lịch hẹn',
                width: '500px'
            });

            if (!confirmLoseFee.isConfirmed) {
                Swal.fire({
                    title: 'Đã giữ lịch!',
                    text: 'Lịch hẹn của bạn vẫn được giữ nguyên.',
                    icon: 'info',
                    confirmButtonColor: '#0284c7'
                });
                return;
            }

            // Gọi API lần 2: Hủy thật với xác nhận mất phí
            const res2 = await fetch(`${window.API_BASE}/api/appointments/${appId}/patient-cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ benh_nhan_id: userInfo.id, acceptLoseFee: true })
            });

            const data2 = await res2.json();
            if (res2.ok) {
                Swal.fire('Đã hủy!', data2.message || 'Hủy lịch hẹn thành công.', 'success');
                fetchMedicalHistory(); // Reload lại danh sách
            } else {
                Swal.fire('Lỗi!', data2.message || 'Có lỗi xảy ra!', 'error');
            }
            return;
        }

        // Trường hợp: Chưa thanh toán → Hủy thẳng thành công
        if (res.ok) {
            Swal.fire('Đã hủy!', data.message || 'Hủy lịch hẹn thành công.', 'success');
            fetchMedicalHistory(); // Reload lại danh sách
        } else {
            Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra khi hủy lịch!', 'error');
        }

    } catch (error) {
        console.error('Lỗi hủy lịch:', error);
        Swal.fire('Lỗi kết nối!', 'Không thể kết nối đến Server!', 'error');
    }
}

// ==================================================
// HÀM XEM VÀ TẢI PHIẾU KHÁM BỆNH (TICKET)
// ==================================================
window.viewAppointmentTicket = function (appId) {
    const app = window.patientAppointments.find(a => a.id === appId);
    if (!app) return;

    const d = new Date(app.ngay_lam_viec);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const timeShow = app.gio_kham || app.khung_gio;

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const patientName = userInfo.ho_ten || userInfo.ten_dang_nhap || 'Bệnh nhân';
    const patientPhone = userInfo.so_dien_thoai || 'Chưa cập nhật';

    // Lấy Số thứ tự (STT) chuẩn xác nhất từ hệ thống
    const stt = app.so_thu_tu || 1;

    // Tiền xử lý các trường dữ liệu bổ sung
    let trieuChungText = app.mo_ta_trieu_chung || 'Không có';
    trieuChungText = trieuChungText.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
    trieuChungText = trieuChungText.replace(/<[^>]*>?/gm, ''); // Xóa thẻ HTML còn sót

    const chuyenKhoa = app.ten_chuyen_khoa || 'Đa khoa';

    // Sửa lỗi hiển thị tiền: Kiểm tra khác null để đảm bảo lấy được cả các ca khám 0đ
    const soTien = (app.so_tien !== null && app.so_tien !== undefined) ? Number(app.so_tien).toLocaleString('vi-VN') + ' VNĐ' : 'Chưa cập nhật';

    let phuongThucTT = 'Chưa xác định';
    if (app.phuong_thuc_thanh_toan) {
        const ptt = app.phuong_thuc_thanh_toan.toLowerCase();
        if (ptt === 'cash') phuongThucTT = 'Tiền mặt';
        else if (ptt === 'transfer') phuongThucTT = 'Chuyển khoản Online';
        else if (ptt === 'momo') phuongThucTT = 'Ví MoMo';
    }

    const ticketHtml = `
        <div id="appointment-ticket" style="background: white; padding: 25px; border-radius: 16px; border: 2px dashed #0ea5e9; width: 100%; max-width: 380px; margin: 0 auto; color: #334155; text-align: left; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #0284c7; font-size: 22px; font-weight: 900; letter-spacing: 1px;"><i class="fa-solid fa-notes-medical"></i> TT MEDICAL</h3>
                <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 700; color: #475569;">PHIẾU KHÁM BỆNH</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #f0f9ff; padding: 15px; border-radius: 12px; border: 1px solid #bae6fd;">
                <div style="font-size: 14px; font-weight: 800; color: #0369a1;">SỐ THỨ TỰ:</div>
                <div style="font-size: 36px; font-weight: 900; color: #ef4444; line-height: 1;">${String(stt).padStart(3, '0')}</div>
            </div>
            
            <div style="font-size: 14px; line-height: 1.8;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Mã lịch khám:</span>
                    <strong style="color: #0f172a; text-align: right;">LK${app.id}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Cơ sở y tế:</span>
                    <strong style="color: #0f172a; text-align: right;">Phòng khám TT Medical</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Bệnh nhân:</span>
                    <strong style="color: #0f172a; text-align: right;">${patientName}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Bác sĩ:</span>
                    <strong style="color: #0f172a; text-align: right;">BS. ${app.ten_bac_si || 'Chưa phân công'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Chuyên khoa:</span>
                    <strong style="color: #0f172a; text-align: right;">${chuyenKhoa}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Triệu chứng:</span>
                    <strong style="color: #0f172a; text-align: right; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${trieuChungText}">${trieuChungText}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Ngày giờ:</span>
                    <strong style="color: #0ea5e9; text-align: right;">${timeShow} (${dateStr})</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-weight: 600;">Tổng tiền:</span>
                    <strong style="color: #10b981; text-align: right;">${soTien}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b; font-weight: 600;">Thanh toán:</span>
                    <strong style="color: #f59e0b; text-align: right;">${phuongThucTT}</strong>
                </div>
            </div>
            
            <div style="margin-top: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; font-size: 13px; color: #64748b; font-style: italic; border: 1px solid #e2e8f0;">
                <i class="fa-solid fa-circle-info" style="color: #f59e0b;"></i> Vui lòng có mặt trước 15 phút và đưa ảnh này cho nhân viên tiếp đón.
            </div>
        </div>
    `;

    Swal.fire({
        html: ticketHtml,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-download"></i> Tải ảnh phiếu',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        customClass: { popup: 'saas-modal' },
        preConfirm: () => {
            Swal.showLoading();
            return new Promise((resolve) => {
                const element = document.getElementById('appointment-ticket');
                if (!element) { resolve(false); return; }

                const loadScript = (src) => new Promise((res, rej) => {
                    if (typeof html2canvas !== 'undefined') { res(); return; }
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = res;
                    script.onerror = rej;
                    document.head.appendChild(script);
                });

                loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
                    .then(() => {
                        html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(canvas => {
                            resolve(canvas.toDataURL('image/png'));
                        });
                    })
                    .catch(() => {
                        Swal.showValidationMessage('Lỗi tải thư viện tạo ảnh. Vui lòng kiểm tra mạng!');
                        resolve(false);
                    });
            });
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const link = document.createElement('a');
            link.download = `PhieuKham_LK${app.id}_${patientName.replace(/\s+/g, '')}.png`;
            link.href = result.value;
            link.click();
            Swal.fire({
                title: 'Tải xuống thành công!',
                text: 'Hãy đưa hình ảnh này cho lễ tân khi bạn đến phòng khám nhé.',
                icon: 'success',
                confirmButtonColor: '#0ea5e9'
            });
        }
    });
};

// ==================================================
// 6.5. HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
// ==================================================
function toggleNotificationPopup(event) {
    if (event) event.preventDefault();
    const popup = document.getElementById('notif-popup');
    if (!popup) return;

    if (popup.style.display === 'none' || popup.style.display === '') {
        popup.style.display = 'block';
        markAllNotifAsRead(); // Tự động đánh dấu đã đọc khi mở popup chuông
    } else {
        popup.style.display = 'none';
    }
}

// Ẩn popup khi click ra ngoài
document.addEventListener('click', (e) => {
    const popup = document.getElementById('notif-popup');
    const btn = document.querySelector('.notification-btn');
    if (popup && popup.style.display === 'block' && btn && !btn.contains(e.target)) {
        popup.style.display = 'none';
    }
});

function markAllNotifAsRead() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) return;

    let maxId = 0;
    if (window.patientAppointments && window.patientAppointments.length > 0) {
        maxId = Math.max(...window.patientAppointments.map(a => a.id));
    }

    // Đánh dấu tất cả thông báo là đã đọc với mốc ID lớn nhất hiện tại
    localStorage.setItem(`lastSeenNotifId_${userInfo.id}`, maxId.toString());

    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = 'none';

    document.querySelectorAll('.notif-item').forEach(el => {
        el.style.background = '#ffffff';
        el.style.border = '1px solid transparent';
    });
}

function processNotifications(history) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.id) return;

    const listEl = document.getElementById('notif-list');
    const dot = document.getElementById('notif-dot');
    if (!listEl) return;

    let notifs = [];

    history.forEach(app => {
        const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
        const dateStr = app.ngay_lam_viec ? new Date(app.ngay_lam_viec).toLocaleDateString('vi-VN') : '';

        let title = '';
        let desc = '';
        let icon = '';
        let bgColor = '';
        let timeLabel = `Cập nhật gần đây`;

        if (status === 'approved') {
            title = `Lịch hẹn đã được duyệt!`;
            desc = `Lịch hẹn khám với BS. ${app.ten_bac_si || ''} ngày ${dateStr} đã được phòng khám xác nhận.`;
            icon = `<i class="fa-solid fa-calendar-check" style="color: #10b981;"></i>`;
            bgColor = `#ecfdf5`;
        } else if (status === 'cancelled') {
            title = `Lịch hẹn bị hủy`;
            desc = `Lịch khám LK${app.id} ngày ${dateStr} đã bị hủy. ${app.ghi_chu_cua_bac_si ? 'L/do: ' + app.ghi_chu_cua_bac_si : ''}`;
            icon = `<i class="fa-solid fa-xmark" style="color: #ef4444;"></i>`;
            bgColor = `#fef2f2`;
        } else if (status === 'done') {
            title = `Đã hoàn thành khám bệnh`;
            desc = `Hồ sơ khám bệnh LK${app.id} đã hoàn tất. Bạn có thể xem kết luận và đơn thuốc của Bác sĩ.`;
            icon = `<i class="fa-solid fa-notes-medical" style="color: #0284c7;"></i>`;
            bgColor = `#f0f9ff`;
        }

        if (title) {
            notifs.push({ id: app.id, title, desc, icon, bgColor, timeLabel, status });
        }
    });

    notifs.sort((a, b) => b.id - a.id);
    notifs = notifs.slice(0, 10);

    if (notifs.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 30px 10px; color: #94a3b8;"><i class="fa-regular fa-bell-slash" style="font-size: 30px; margin-bottom: 10px;"></i><br>Bạn chưa có thông báo nào.</div>`;
        return;
    }

    const lastSeenId = parseInt(localStorage.getItem(`lastSeenNotifId_${userInfo.id}`) || '0');
    let hasUnread = false;
    let html = '';

    notifs.forEach(n => {
        const isUnread = n.id > lastSeenId;
        if (isUnread) hasUnread = true;

        const itemBg = isUnread ? '#f8fafc' : '#ffffff';
        const borderColor = isUnread ? '#e2e8f0' : 'transparent';
        const targetAction = n.status === 'done' ? "switchProfileTab('record')" : "switchProfileTab('history')";

        html += `
            <div class="notif-item" onclick="scrollToSection('btn-tab-history', event); ${targetAction}; toggleNotificationPopup(event);" style="padding: 12px; margin-bottom: 8px; border-radius: 12px; background: ${itemBg}; display: flex; gap: 12px; cursor: pointer; transition: 0.2s; border: 1px solid ${borderColor};">
                <div style="min-width: 40px; height: 40px; border-radius: 50%; background: ${n.bgColor}; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                    ${n.icon}
                </div>
                <div>
                    <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${n.title}</h5>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #475569; line-height: 1.4;">${n.desc}</p>
                    <span style="font-size: 11px; color: #94a3b8;"><i class="fa-regular fa-clock"></i> ${n.timeLabel}</span>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;

    if (hasUnread) {
        if (dot) dot.style.display = 'block';
    } else {
        if (dot) dot.style.display = 'none';
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
        star.addEventListener('click', function () {
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
                clonedUser.addEventListener('click', function (e) {
                    // Nếu bấm vào nút bên trong (VD: Đăng xuất) thì không toggle nữa
                    if (e.target.tagName.toLowerCase() !== 'a' && e.target.closest('a') === null) {
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

// ==================================================
// 8. TÌM KIẾM TOÀN CỤC (GLOBAL SEARCH)
// ==================================================
function handleGlobalSearch() {
    const inputEl = document.getElementById('globalSearchInput');
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!inputEl || !resultsContainer) return;

    const keyword = inputEl.value.toLowerCase().trim();
    
    // Gõ ít nhất 2 ký tự mới bắt đầu tìm kiếm
    if (keyword.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    let resultsHtml = '';
    let hasResults = false;

    // 1. Tìm Bác sĩ (Lấy từ biến homeDoctorsList bên file home_doctors.js)
    if (typeof homeDoctorsList !== 'undefined' && homeDoctorsList.length > 0) {
        const matchedDocs = homeDoctorsList.filter(doc => 
            (doc.ho_ten && doc.ho_ten.toLowerCase().includes(keyword)) ||
            (doc.ten_chuyen_khoa && doc.ten_chuyen_khoa.toLowerCase().includes(keyword))
        ).slice(0, 3); // Lấy tối đa 3 kết quả để tránh dropdown quá dài

        if (matchedDocs.length > 0) {
            hasResults = true;
            resultsHtml += `<div style="padding: 10px 15px; font-weight: 700; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background: #f8fafc; position: sticky; top: 0;">Bác sĩ & Chuyên khoa</div>`;
            matchedDocs.forEach(doc => {
                const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=random`;
                const imgSrc = doc.anh_dai_dien && doc.anh_dai_dien.trim() !== "" ? (doc.anh_dai_dien.startsWith('http') || doc.anh_dai_dien.startsWith('data:') ? doc.anh_dai_dien : window.API_BASE + '/uploads/' + doc.anh_dai_dien) : defaultImg;
                
                // Khi click vào bác sĩ -> Chuyển sang Tab Đặt lịch và tự động điền tên vào ô tìm kiếm
                resultsHtml += `
                    <div onclick="document.getElementById('globalSearchResults').style.display='none'; switchTab(event, 'tab-dat-lich'); setTimeout(() => { const bookingInput = document.getElementById('booking_search_input'); if(bookingInput) { bookingInput.value = '${doc.ho_ten}'; onBookingSearchInput(); } }, 500);" style="padding: 10px 15px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: 0.2s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'">
                        <img src="${imgSrc}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.src='${defaultImg}'">
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">BS. ${doc.ho_ten}</div>
                            <div style="font-size: 12px; color: #0284c7;">${doc.ten_chuyen_khoa || 'Chuyên khoa'}</div>
                        </div>
                    </div>
                `;
            });
        }
    }

    // 2. Tìm Hỏi Đáp (Lấy từ biến window.allCommunityQA)
    if (typeof window.allCommunityQA !== 'undefined' && window.allCommunityQA.length > 0) {
        const matchedQA = window.allCommunityQA.filter(q => 
            (q.tieu_de && q.tieu_de.toLowerCase().includes(keyword)) ||
            (q.noi_dung && q.noi_dung.toLowerCase().includes(keyword))
        ).slice(0, 3); // Lấy tối đa 3 kết quả

        if (matchedQA.length > 0) {
            hasResults = true;
            resultsHtml += `<div style="padding: 10px 15px; font-weight: 700; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; background: #f8fafc; position: sticky; top: 0;">Cộng đồng Hỏi Đáp</div>`;
            matchedQA.forEach(q => {
                let displayTieuDe = q.tieu_de || 'Câu hỏi';
                if (displayTieuDe.startsWith('[Ẩn danh]')) {
                    displayTieuDe = displayTieuDe.replace('[Ẩn danh] ', '').replace('[Ẩn danh]', '');
                }
                const nguoiDaTraLoi = q.ten_nguoi_tra_loi ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? 'Quản trị viên' : 'BS. ' + q.ten_nguoi_tra_loi) : 'Bác sĩ';
                const tieuDeEncoded = encodeURIComponent(displayTieuDe);
                const noiDungEncoded = encodeURIComponent(q.noi_dung || '');
                const traLoiEncoded = encodeURIComponent(q.tra_loi || '');
                const nguoiTraLoiEncoded = encodeURIComponent(nguoiDaTraLoi);
                const popupArgs = `decodeURIComponent('${tieuDeEncoded}'), decodeURIComponent('${noiDungEncoded}'), decodeURIComponent('${traLoiEncoded}'), decodeURIComponent('${nguoiTraLoiEncoded}')`;

                resultsHtml += `
                    <div onclick="document.getElementById('globalSearchResults').style.display='none'; openQADetailPopup(${popupArgs});" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: 0.2s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'">
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fa-solid fa-circle-question" style="color: #10b981;"></i> ${displayTieuDe}</div>
                        <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${q.noi_dung}</div>
                    </div>
                `;
            });
        }
    }

    if (hasResults) {
        resultsContainer.innerHTML = resultsHtml;
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.innerHTML = `<div style="padding: 15px; text-align: center; color: #64748b; font-size: 14px;">Không tìm thấy kết quả phù hợp cho "<b>${document.getElementById('globalSearchInput').value}</b>"</div>`;
        resultsContainer.style.display = 'block';
    }
}

// Ẩn kết quả tìm kiếm khi click ra ngoài vùng search
document.addEventListener('click', function(e) {
    const searchBar = document.querySelector('.search-bar');
    const resultsContainer = document.getElementById('globalSearchResults');
    if (searchBar && !searchBar.contains(e.target) && resultsContainer) {
        resultsContainer.style.display = 'none';
    }
});
