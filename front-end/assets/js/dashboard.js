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
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) { 
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '../index.html'; 
    }
}

// Format Tiền tệ dùng chung
function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US') + ' VNĐ';
}