// Mở popup
function openModal(modalId, e) {
    if(e) e.preventDefault();
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
}

// Đóng popup
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto'; 
}

// Chuyển qua lại giữa 2 popup
function switchModal(closeId, openId, e) {
    if(e) e.preventDefault();
    closeModal(closeId);
    openModal(openId, e);
}

// Bấm ra ngoài rìa tự tắt
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Hàm cuộn mượt mà đến các phần trên trang
function scrollToSection(sectionId, event) {
    if (event) event.preventDefault();
    
    const mainContent = document.getElementById('main-home-content');
    // Nếu đang xem bài viết (trang chủ bị ẩn), thì hiện lại trang chủ trước
    if (mainContent && mainContent.style.display === 'none') {
        if(typeof returnToHome === 'function') returnToHome();
        setTimeout(() => {
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        }, 100); // Đợi hiển thị xong mới cuộn
    } else {
        document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
    }
}