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

// =========================================================
// LOGIC SLIDER TRANG CHỦ
// =========================================================
let heroSlideInterval;
let isSliderAnimating = false; // Cờ chống click spam liên tục

function initHeroSlider() {
    const slider = document.getElementById('hero-slider');
    if (!slider) return;
    
    startHeroSlideInterval();
}

function moveSlide(direction) {
    if (isSliderAnimating) return; // Nếu đang chạy hiệu ứng thì không nhận click mới
    const slider = document.getElementById('hero-slider');
    if (!slider) return;
    
    isSliderAnimating = true;
    clearInterval(heroSlideInterval); // Tạm dừng tự động chạy
    
    if (direction === 1) {
        // Trượt sang trái (Next)
        slider.style.transition = 'transform 0.8s ease-in-out';
        slider.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            slider.style.transition = 'none'; // Tắt hiệu ứng để lén xếp lại ảnh
            slider.appendChild(slider.firstElementChild); // Cắt ảnh đầu gắn xuống cuối
            slider.style.transform = 'translateX(0)'; // Đặt lại khung nhìn
            isSliderAnimating = false;
            startHeroSlideInterval();
        }, 800); // 800ms bằng đúng thời gian CSS transition chạy
    } else {
        // Trượt sang phải (Prev)
        slider.style.transition = 'none';
        slider.prepend(slider.lastElementChild); // Lấy ảnh cuối đưa lên đầu
        slider.style.transform = 'translateX(-100%)';
        
        slider.offsetHeight; // Ép trình duyệt vẽ lại (reflow)
        
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

document.addEventListener('DOMContentLoaded', initHeroSlider);