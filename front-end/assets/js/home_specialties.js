async function fetchHomeSpecialties() {
    try {
        const response = await fetch('http://localhost:3000/api/specialties');
        const specialties = await response.json();
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
                <a href="#" class="service-link" onclick="Swal.fire('Thông báo', 'Tính năng xem chi tiết dịch vụ đang phát triển!', 'info')">Tìm hiểu thêm &rarr;</a>
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

document.addEventListener('DOMContentLoaded', fetchHomeSpecialties);