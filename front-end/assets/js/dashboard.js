/* =========================================================================================
   GHI CHÚ QUAN TRỌNG VỀ LUỒNG DỮ LIỆU (DATA FLOW) CỦA HỆ THỐNG TT MEDICAL:
   
   1. DATABASE LÀ TRUNG TÂM (Single Source of Truth):
      Toàn bộ dữ liệu hiển thị trên Trang Admin này đều được kéo (GET) từ CSDL SQL.
      
   2. TÁC ĐỘNG TỪ ADMIN ĐẾN TRANG CHỦ (USER INTERFACE):
      Bất kỳ thao tác nào của Admin trên trang này (Thêm Bác sĩ, Đăng Bài viết, Khóa Tài khoản, 
      Duyệt Lịch hẹn, Trả lời Câu hỏi...) đều sẽ gọi API (POST/PUT/DELETE) để cập nhật thẳng 
      vào CSDL SQL. 
      -> HỆ QUẢ: Người dùng (Bệnh nhân) khi truy cập Trang chủ sẽ ngay lập tức nhìn thấy 
      những thay đổi này (Ví dụ: Thấy bài viết mới, thấy lịch hẹn đã được duyệt, không thể 
      đăng nhập nếu bị khóa...).

   3. TÁC ĐỘNG TỪ TRANG CHỦ ĐẾN ADMIN:
      Ngược lại, khi Người dùng (Bệnh nhân) thao tác trên Trang chủ (Đăng ký tài khoản mới, 
      Đặt lịch khám, Gửi câu hỏi...), dữ liệu cũng sẽ được đẩy vào CSDL. 
      -> HỆ QUẢ: Admin khi mở trang Dashboard này lên sẽ lập tức thấy tài khoản mới, 
      lịch hẹn mới cần duyệt ở trạng thái "Pending", và câu hỏi mới cần trả lời.

   * LƯU Ý KHI CODE BACKEND (NODE.JS): Mọi hàm fetch() ở các file js con (doctor.js, account.js...) 
   phải được trỏ đúng vào các Endpoint API tương ứng để vòng lặp dữ liệu này hoạt động.
========================================================================================= */

// Chuyển Tab Menu
function switchTab(tabName, clickedElement) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    clickedElement.classList.add('active');

    const allSections = document.querySelectorAll('.content');
    allSections.forEach(section => section.style.display = 'none');

    document.getElementById('section-' + tabName).style.display = 'block';
}

// Đóng Modal dùng chung
function closeModal(modalId) { 
    document.getElementById(modalId).style.display = 'none'; 
}

// Tắt Modal khi bấm ra ngoài vùng tối
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// Đăng xuất
function confirmLogout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: "Bạn có chắc chắn muốn thoát khỏi phiên làm việc?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0284C7',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminInfo');
            window.location.href = '../index.html'; 
        }
    });
}

// Format Tiền tệ dùng chung
function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US') + ' VNĐ';
}

// =========================================================================================
// QUẢN LÝ CA LÀM VIỆC (ADMIN)
// =========================================================================================
const shiftTbody = document.getElementById('shiftAdminTableBody');
let allAdminShifts = [];

async function fetchAdminShifts() {
    if (!shiftTbody) return;
    try {
        const response = await fetch('http://localhost:3000/api/doctors/shifts/admin/all');
        allAdminShifts = await response.json();
        renderAdminShiftTable();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu ca làm việc:', error);
    }
}

function renderAdminShiftTable() {
    if (!shiftTbody) return;
    shiftTbody.innerHTML = '';

    const searchInput = document.getElementById('searchAdminShift');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredShifts = allAdminShifts;
    if (keyword) {
        filteredShifts = filteredShifts.filter(shift => 
            (shift.ten_bac_si && shift.ten_bac_si.toLowerCase().includes(keyword)) ||
            `clv${shift.id}`.includes(keyword)
        );
    }

    if (filteredShifts.length === 0) {
        shiftTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy ca làm việc phù hợp.</td></tr>`;
        return;
    }

    filteredShifts.forEach(shift => {
        const d = new Date(shift.ngay_lam_viec);
        const ngayLamStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        
        let statusHtml = '';
        if (shift.trang_thai === 'Stopped') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;">Đã dừng</span>`;
        } else if (shift.so_luong_hien_tai >= shift.so_luong_toi_da) {
            statusHtml = `<span class="badge" style="background:#fef3c7; color:#d97706;">Đã kín</span>`;
        } else {
            statusHtml = `<span class="badge" style="background:#dcfce7; color:#166534;">Đang mở</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#CLV${shift.id}</strong></td>
            <td style="color: var(--primary-color); font-weight: 600;">BS. ${shift.ten_bac_si}</td>
            <td>${shift.ten_chuyen_khoa || 'Đa khoa'}</td>
            <td>${ngayLamStr}</td>
            <td style="font-weight: 600;">${shift.khung_gio}</td>
            <td><span style="color:#0284c7; font-weight:bold;">${shift.so_luong_hien_tai}</span> / ${shift.so_luong_toi_da}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteAdminShift(${shift.id})" title="Xóa ca làm việc này"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        shiftTbody.appendChild(tr);
    });
}

function deleteAdminShift(id) {
    Swal.fire({
        title: 'Cảnh báo hệ thống',
        text: `Bạn đang thực hiện xóa Ca làm việc #CLV${id} dưới quyền Admin. Dữ liệu rác (nếu có) sẽ bị dọn sạch. Bạn có chắc chắn không?`,
        icon: 'warning',
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#9ca3af', 
        confirmButtonText: 'Đồng ý xóa', 
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/doctors/shifts/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) { 
                    Swal.fire('Đã xóa!', data.message, 'success'); 
                    fetchAdminShifts(); 
                } else { 
                    Swal.fire('Hệ thống từ chối!', data.message, 'error'); 
                }
            } catch (error) { 
                console.error('Lỗi API Xóa:', error); 
                Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error'); 
            }
        }
    });
}

// Gọi API ngay khi tải trang
fetchAdminShifts();