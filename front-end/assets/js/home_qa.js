window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
let homeQAData = [];
let allAnsweredQA = []; // Lưu TẤT CẢ các câu hỏi đã trả lời để dùng cho Popup
let currentHomeQAPage = 1;
const homeQAItemsPerPage = 4;

async function fetchHomeQA() {
    try {
        const response = await fetch(window.API_BASE + '/api/questions');
        const questions = await response.json();
        
        // LỌC 1: Lấy tất cả câu hỏi đã được trả lời
        allAnsweredQA = questions.filter(q => q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== ''));
        
        // Lấy thông tin user hiện tại (nếu đang đăng nhập) để xử lý quyền xem câu hỏi Ẩn danh
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const currentUserId = userInfo.id || null;
        
        // LỌC 2: Độc nhất theo người dùng. Mỗi bệnh nhân chỉ lấy 1 câu đại diện để hiển thị trên trang chủ
        const uniqueUsers = new Set();
        homeQAData = [];
        
        allAnsweredQA.forEach(q => {
            let isAnDanh = false;
            if (q.tieu_de && q.tieu_de.startsWith('[Ẩn danh]')) isAnDanh = true;
            else if (!q.nguoi_hoi || q.nguoi_hoi.trim() === '') isAnDanh = true;

            // NẾU LÀ CÂU HỎI ẨN DANH: Chỉ có chủ tài khoản mới được thấy (Dùng != để tránh lỗi string/int).
            if (isAnDanh && q.benh_nhan_id != currentUserId) {
                return; 
            }

            // Gom nhóm duy nhất theo tài khoản (Mỗi tài khoản chỉ 1 thẻ hiển thị)
            const identifier = q.benh_nhan_id ? `id_${q.benh_nhan_id}` : `name_${q.nguoi_hoi}`;
            
            if (!uniqueUsers.has(identifier)) {
                uniqueUsers.add(identifier);
                homeQAData.push(q);
            }
        });
        
        renderHomeQA();
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỏi đáp:', error);
    }
}

function renderHomeQA() {
    const container = document.getElementById('faq-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (homeQAData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px; font-size: 16px; width: 100%;">Hiện chưa có câu hỏi nào được giải đáp.</p>';
        const paginationContainer = document.getElementById('home_qa_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(homeQAData.length / homeQAItemsPerPage);
    if (currentHomeQAPage > totalPages) currentHomeQAPage = totalPages;
    if (currentHomeQAPage < 1) currentHomeQAPage = 1;

    const startIndex = (currentHomeQAPage - 1) * homeQAItemsPerPage;
    const endIndex = startIndex + homeQAItemsPerPage;
    const paginatedQA = homeQAData.slice(startIndex, endIndex);

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const currentUserId = userInfo.id || null;

    paginatedQA.forEach((q) => {
        const div = document.createElement('div');
        div.className = 'qa-home-card';
        
        // Xử lý tên người trả lời
        const nguoiDaTraLoi = q.ten_nguoi_tra_loi 
            ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? `Quản trị viên - ${q.ten_nguoi_tra_loi}` : `BS. ${q.ten_nguoi_tra_loi}`) 
            : 'Bác sĩ chuyên khoa';

        // Tag chuyên khoa
        const chuyenKhoa = q.ten_chuyen_khoa ? `<span style="background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 12px; font-size: 12px; margin-left: 12px; font-weight: 600; white-space: nowrap;">${q.ten_chuyen_khoa}</span>` : '';

        // Xử lý tên người hỏi, Avatar và Tiêu đề ẩn danh
        let isAnDanh = false;
        let displayTieuDe = q.tieu_de || 'Câu hỏi từ bệnh nhân';
        
        if (displayTieuDe.startsWith('[Ẩn danh]')) {
            isAnDanh = true;
            displayTieuDe = displayTieuDe.replace('[Ẩn danh] ', '').replace('[Ẩn danh]', '');
        } else if (!q.nguoi_hoi || q.nguoi_hoi.trim() === '') {
            isAnDanh = true;
        }

        const tenNguoiHoi = isAnDanh ? 'Ẩn danh' : q.nguoi_hoi;
        const avatarContent = isAnDanh ? '<i class="fa-solid fa-user-secret" style="font-size: 13px;"></i>' : tenNguoiHoi.charAt(0).toUpperCase();

        // Đổi màu tên người hỏi nếu là câu hỏi của bản thân
        const isMyQuestion = (q.benh_nhan_id && q.benh_nhan_id == currentUserId);
        const nameColor = isMyQuestion ? '#2563eb' : '#0f172a';

        // Xử lý Ngày và Giờ hiển thị
        const dateObj = new Date(q.ngay_tao || Date.now());
        const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        const dateTimeDisplay = `${timeStr} - ${dateStr}`;

        // Tạo nội dung tóm tắt (Loại bỏ xuống dòng để tránh vỡ giao diện thẻ)
        const noiDungSummary = q.noi_dung ? q.noi_dung.replace(/\n/g, ' ') : '';
        const traLoiSummary = q.tra_loi ? q.tra_loi.replace(/\n/g, ' ') : '';

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="min-width: 40px; height: 40px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">
                        ${avatarContent}
                    </div>
                    <div>
                        <div style="font-weight: 700; color: ${nameColor}; font-size: 15px;">${tenNguoiHoi}</div>
                        <div style="color: #64748b; font-size: 12px; font-weight: 500;">${q.ten_chuyen_khoa || 'Hỏi đáp chung'} • <i class="fa-regular fa-clock"></i> ${dateTimeDisplay}</div>
                    </div>
                </div>
            </div>
            <div style="flex: 1;">
                <h4 class="text-clamp-2" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; line-height: 1.4; height: 45px;">${displayTieuDe}</h4>
                <p class="text-clamp-3" style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0; height: 67px;">${noiDungSummary}</p>
            </div>
            <div style="margin-top: auto; padding-top: 15px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 28px; height: 28px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                        <i class="fa-solid fa-check-double"></i>
                    </div>
                    <span style="font-size: 13px; font-weight: 600; color: #166534;">Đã có trả lời</span>
                </div>
                <div style="text-align: right;">
                    <span class="btn-view-qa" style="background: #f0f9ff; color: #0284c7; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid #bae6fd; transition: 0.3s; cursor: pointer;">Xem chi tiết <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 2px;"></i></span>
                </div>
            </div>
        `;

        // Chỉ gán sự kiện mở Popup khi click vào nút "Xem chi tiết"
        const btnView = div.querySelector('.btn-view-qa');
        if (btnView) {
            btnView.onclick = (e) => {
                e.stopPropagation();
                
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                const currentUserId = userInfo.id || null;

                const identifier = q.benh_nhan_id ? `id_${q.benh_nhan_id}` : `name_${q.nguoi_hoi}`;

                // Lấy TẤT CẢ câu hỏi của cùng người dùng này từ mảng gốc (allAnsweredQA)
                const userAllQuestions = allAnsweredQA.filter(x => {
                    let xIsAnDanh = false;
                    if (x.tieu_de && x.tieu_de.startsWith('[Ẩn danh]')) xIsAnDanh = true;
                    else if (!x.nguoi_hoi || x.nguoi_hoi.trim() === '') xIsAnDanh = true;

                    // Nếu trong lịch sử có câu hỏi ẩn danh, chặn không cho người lạ xem (Dùng != tránh lỗi kiểu dữ liệu)
                    if (xIsAnDanh && x.benh_nhan_id != currentUserId) {
                        return false;
                    }

                    const xId = x.benh_nhan_id ? `id_${x.benh_nhan_id}` : `name_${x.nguoi_hoi}`;
                    return xId === identifier;
                });

                // Bọc trong thẻ div có cuộn dọc (scrollbar) để tránh popup dài vượt quá màn hình
                let popupContent = '<div style="text-align: left; font-size: 15px; color: #334155; line-height: 1.6; max-height: 450px; overflow-y: auto; padding-right: 15px;">';
                
                userAllQuestions.forEach((item, index) => {
                    const d = new Date(item.ngay_tao || Date.now());
                    const dtDisplay = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    const bsTraLoi = item.ten_nguoi_tra_loi ? (item.vai_tro_tra_loi === 'Admin' || item.vai_tro_tra_loi === 'Quản trị viên' ? `Quản trị viên - ${item.ten_nguoi_tra_loi}` : `BS. ${item.ten_nguoi_tra_loi}`) : 'Bác sĩ';
                    
                    let tieuDeDisplay = item.tieu_de || 'Câu hỏi';
                    let currentIsAnDanh = false;
                    if (tieuDeDisplay.startsWith('[Ẩn danh]')) {
                        currentIsAnDanh = true;
                        tieuDeDisplay = tieuDeDisplay.replace('[Ẩn danh] ', '').replace('[Ẩn danh]', '');
                    } else if (!item.nguoi_hoi || item.nguoi_hoi.trim() === '') {
                        currentIsAnDanh = true;
                    }

                    const displayAskerName = currentIsAnDanh ? "Ẩn danh" : (item.nguoi_hoi || "Ẩn danh");

                    const isMyItem = (item.benh_nhan_id && item.benh_nhan_id == currentUserId);
                    const itemTitleColor = isMyItem ? '#2563eb' : '#0ea5e9';

                    popupContent += `
                        <div style="margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 15px;">
                            <div style="margin-bottom: 10px;">
                                <span style="color: ${itemTitleColor}; font-weight: 700; font-size: 16px;">${displayAskerName}: ${tieuDeDisplay}</span><br>
                                <span style="color: #64748b; font-size: 12px;"><i class="fa-regular fa-clock"></i> ${dtDisplay}</span>
                            </div>
                            <p style="margin-bottom: 15px;"><strong>Nội dung hỏi:</strong><br>${item.noi_dung ? item.noi_dung.replace(/\n/g, '<br>') : ''}</p>
                            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                                <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600;"><i class="fa-solid fa-user-doctor"></i> ${bsTraLoi} giải đáp:</p>
                                <p style="margin: 0;">${item.tra_loi ? item.tra_loi.replace(/\n/g, '<br>') : ''}</p>
                            </div>
                        </div>
                    `;
                });
                
                popupContent += '</div>';

                let popupTitle = userAllQuestions.length > 1 ? `Tất cả câu hỏi từ ${tenNguoiHoi}` : `Chi tiết câu hỏi`;
                if (isAnDanh && userAllQuestions.length > 1) {
                    popupTitle = 'Tất cả câu hỏi của bạn';
                }

                Swal.fire({
                    title: popupTitle,
                    html: popupContent,
                    width: '750px',
                    confirmButtonText: 'Đóng',
                    confirmButtonColor: '#0284c7'
                });
            };
        }

        container.appendChild(div);
    });

    renderHomeQAPagination(totalPages);
}

function renderHomeQAPagination(totalPages) {
    let paginationContainer = document.getElementById('home_qa_pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'home_qa_pagination';
        paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 30px; width: 100%;';
        
        const faqContainer = document.getElementById('faq-list-container');
        faqContainer.parentNode.insertBefore(paginationContainer, faqContainer.nextSibling);
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentHomeQAPage > 1) {
        html += `<button class="btn btn-outline" style="padding: 8px 15px; border-radius: 8px;" onclick="changeHomeQAPage(${currentHomeQAPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentHomeQAPage) {
            html += `<button class="btn btn-primary" style="padding: 8px 15px; border-radius: 8px; cursor: default;">${i}</button>`;
        } else {
            html += `<button class="btn btn-outline" style="padding: 8px 15px; border-radius: 8px;" onclick="changeHomeQAPage(${i})">${i}</button>`;
        }
    }

    if (currentHomeQAPage < totalPages) {
        html += `<button class="btn btn-outline" style="padding: 8px 15px; border-radius: 8px;" onclick="changeHomeQAPage(${currentHomeQAPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeHomeQAPage(page) {
    currentHomeQAPage = page;
    renderHomeQA();
    // Tự động cuộn êm mượt lên đầu phần hỏi đáp để xem
    const section = document.getElementById('hoi-dap');
    if (section) {
        const y = section.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

document.addEventListener('DOMContentLoaded', fetchHomeQA);
