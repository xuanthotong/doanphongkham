// Khai báo biến toàn cục để lưu trữ dữ liệu chuyên khoa dùng cho việc xem chi tiết
let windowSpecialtiesData = [];

async function fetchHomeSpecialties() {
    try {
        const response = await fetch('http://localhost:3000/api/specialties');
        const specialties = await response.json();
        windowSpecialtiesData = specialties; // Lưu lại dữ liệu
        renderHomeSpecialties(specialties);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách chuyên khoa:', error);
    }
}

function renderHomeSpecialties(specialties) {
    const container = document.getElementById('specialty-list-container');
    const dropdown = document.getElementById('specialty-dropdown');
    const footerList = document.getElementById('footer-specialty-list');

    if (container) container.innerHTML = '';
    if (dropdown) dropdown.innerHTML = '';
    if (footerList) footerList.innerHTML = '';

    if (specialties.length === 0) {
        if (container) container.innerHTML = '<p style="text-align: center; color: #666; width: 100%; grid-column: 1 / -1;">Hiện tại phòng khám chưa cập nhật chuyên khoa nào.</p>';
        if (dropdown) dropdown.innerHTML = '<li><a href="#">Chưa có dịch vụ</a></li>';
        if (footerList) footerList.innerHTML = '<li><a href="#">Chưa có chuyên khoa</a></li>';
        return;
    }

    // Mảng các icon và màu sắc ngẫu nhiên để giao diện sinh động giống bản HTML cũ
    const icons = [
        { icon: '<i class="fa-solid fa-stethoscope"></i>', colorClass: 'icon-blue' },
        { icon: '<i class="fa-regular fa-heart"></i>', colorClass: 'icon-pink' },
        { icon: '<i class="fa-solid fa-brain"></i>', colorClass: 'icon-yellow' },
        { icon: '<i class="fa-solid fa-baby"></i>', colorClass: 'icon-pink' },
        { icon: '<i class="fa-regular fa-eye"></i>', colorClass: 'icon-blue' },
        { icon: '<i class="fa-solid fa-bone"></i>', colorClass: 'icon-yellow' },
        { icon: '<i class="fa-solid fa-lungs"></i>', colorClass: 'icon-pink' },
        { icon: '<i class="fa-solid fa-tooth"></i>', colorClass: 'icon-blue' }
    ];

    specialties.forEach((spec, index) => {
        // Lấy icon xoay vòng nếu số lượng chuyên khoa nhiều hơn số icon mảng trên
        const iconObj = icons[index % icons.length];

        // Kiểm tra chặt chẽ: Phải có dữ liệu và không được chỉ chứa mỗi dấu cách
        const moTaText = (spec.mo_ta && spec.mo_ta.trim() !== "") ? spec.mo_ta : `Khám và điều trị chuyên sâu các bệnh lý liên quan đến ${spec.ten_chuyen_khoa.toLowerCase()} với trang thiết bị hiện đại.`;

        // 1. Render thẻ card chuyên khoa ở giữa trang chủ
        if (container) {
            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <div class="service-icon ${iconObj.colorClass}">${iconObj.icon}</div>
                <h3>${spec.ten_chuyen_khoa}</h3>
                <p style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; min-height: 70px;">${moTaText}</p>
                <a href="#" class="service-link" onclick="openSpecialtyDetail(${spec.id}, event)">Tìm hiểu thêm &rarr;</a>
            `;
            container.appendChild(div);
        }

        // 2. Render list thả xuống ở thanh Menu
        if (dropdown) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#dich-vu" onclick="scrollToSection('dich-vu', event)">${spec.ten_chuyen_khoa}</a>`;
            dropdown.appendChild(li);
        }

        // 3. Render list ở Footer (chỉ lấy tối đa 5 chuyên khoa đầu tiên để Footer không bị dài thòng)
        if (footerList && index < 5) {
            const liFooter = document.createElement('li');
            liFooter.innerHTML = `<a href="#dich-vu" onclick="scrollToSection('dich-vu', event)">${spec.ten_chuyen_khoa}</a>`;
            footerList.appendChild(liFooter);
        }
    });
}

// Hàm mở Modal và hiển thị dữ liệu chi tiết
function openSpecialtyDetail(id, event) {
    if (event) event.preventDefault();
    
    // Tìm chuyên khoa trong mảng dựa vào ID
    const spec = windowSpecialtiesData.find(s => s.id === id);
    if (!spec) return;

    const moTa = spec.mo_ta ? spec.mo_ta.replace(/\n/g, '<br>') : "Chưa có mô tả chi tiết cho chuyên khoa này.";

    // Sử dụng SweetAlert2 để tạo Popup tự động mà không cần thêm code HTML
    Swal.fire({
        title: `<strong style="color: #0284c7; font-size: 24px;">${spec.ten_chuyen_khoa}</strong>`,
        html: `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="width: 70px; height: 70px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto;">
                    <i class="fa-solid fa-stethoscope"></i>
                </div>
            </div>
            <div style="text-align: justify; color: #4b5563; line-height: 1.6; font-size: 15px; max-height: 400px; overflow-y: auto; padding: 10px; border-top: 1px solid #e5e7eb; margin-top: 10px;">
                ${moTa}
            </div>
        `,
        width: '600px',
        showCloseButton: true,
        showConfirmButton: false
    });
}

document.addEventListener('DOMContentLoaded', fetchHomeSpecialties);