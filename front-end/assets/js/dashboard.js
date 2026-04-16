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
        window.location.href = "../login.html"; 
    }
}

// Format Tiền tệ dùng chung
function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US') + ' VNĐ';
}