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

// Bộ từ điển tự động nhận diện tên chuyên khoa và gán Icon Y tế chuẩn
function getSpecialtyIcon(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('sản') || lowerName.includes('phụ khoa')) return { icon: '<i class="fa-solid fa-person-pregnant"></i>', colorClass: 'icon-pink' };
    if (lowerName.includes('nhi')) return { icon: '<i class="fa-solid fa-baby"></i>', colorClass: 'icon-yellow' };
    if (lowerName.includes('tai') || lowerName.includes('mũi') || lowerName.includes('họng')) return { icon: '<i class="fa-solid fa-ear-listen"></i>', colorClass: 'icon-blue' };
    if (lowerName.includes('mắt') || lowerName.includes('nhãn')) return { icon: '<i class="fa-solid fa-eye"></i>', colorClass: 'icon-blue' };
    if (lowerName.includes('răng') || lowerName.includes('nha')) return { icon: '<i class="fa-solid fa-tooth"></i>', colorClass: 'icon-blue' };
    if (lowerName.includes('tim') || lowerName.includes('mạch')) return { icon: '<i class="fa-solid fa-heart-pulse"></i>', colorClass: 'icon-pink' };
    if (lowerName.includes('thần kinh') || lowerName.includes('tâm thần')) return { icon: '<i class="fa-solid fa-brain"></i>', colorClass: 'icon-yellow' };
    if (lowerName.includes('xương') || lowerName.includes('khớp') || lowerName.includes('chấn thương')) return { icon: '<i class="fa-solid fa-bone"></i>', colorClass: 'icon-yellow' };
    if (lowerName.includes('phổi') || lowerName.includes('hô hấp')) return { icon: '<i class="fa-solid fa-lungs"></i>', colorClass: 'icon-blue' };
    if (lowerName.includes('tiêu hóa') || lowerName.includes('dạ dày')) return { icon: '<i class="fa-solid fa-capsules"></i>', colorClass: 'icon-yellow' };
    if (lowerName.includes('da liễu')) return { icon: '<i class="fa-solid fa-hand-dots"></i>', colorClass: 'icon-pink' };
    if (lowerName.includes('xét nghiệm') || lowerName.includes('huyết học') || lowerName.includes('nội tiết')) return { icon: '<i class="fa-solid fa-vial"></i>', colorClass: 'icon-blue' };
    if (lowerName.includes('chẩn đoán hình ảnh') || lowerName.includes('x-quang') || lowerName.includes('siêu âm')) return { icon: '<i class="fa-solid fa-x-ray"></i>', colorClass: 'icon-blue' };
    
    // Mặc định cho Đa khoa hoặc các khoa khác
    return { icon: '<i class="fa-solid fa-stethoscope"></i>', colorClass: 'icon-blue' };
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

    specialties.forEach((spec, index) => {
        // Tự động nhận diện icon dựa trên tên chuyên khoa
        const iconObj = getSpecialtyIcon(spec.ten_chuyen_khoa);

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
            li.innerHTML = `<a href="#" onclick="openSpecialtyDetail(${spec.id}, event)">${spec.ten_chuyen_khoa}</a>`;
            dropdown.appendChild(li);
        }

        // 3. Render list ở Footer (chỉ lấy tối đa 5 chuyên khoa đầu tiên để Footer không bị dài thòng)
        if (footerList && index < 5) {
            const liFooter = document.createElement('li');
            liFooter.innerHTML = `<a href="#" onclick="openSpecialtyDetail(${spec.id}, event)">${spec.ten_chuyen_khoa}</a>`;
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

    // Lấy đúng icon của chuyên khoa đó để hiển thị trong Popup
    const iconObj = getSpecialtyIcon(spec.ten_chuyen_khoa);

    // Sử dụng SweetAlert2 để tạo Popup tự động mà không cần thêm code HTML
    Swal.fire({
        title: `<strong style="color: #0284c7; font-size: 24px;">${spec.ten_chuyen_khoa}</strong>`,
        html: `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="width: 70px; height: 70px; background: ${iconObj.colorClass === 'icon-pink' ? '#fce7f3' : (iconObj.colorClass === 'icon-yellow' ? '#fef3c7' : '#e0f2fe')}; color: ${iconObj.colorClass === 'icon-pink' ? '#db2777' : (iconObj.colorClass === 'icon-yellow' ? '#d97706' : '#0284c7')}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto;">
                    ${iconObj.icon}
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