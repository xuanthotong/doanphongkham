let homeDoctorsList = []; // Lưu trữ danh sách bác sĩ toàn cục để dùng cho chức năng xem chi tiết

async function fetchHomeDoctors() {
    try {
        const response = await fetch('http://localhost:3000/api/doctors');
        homeDoctorsList = await response.json(); // Lưu vào biến toàn cục
        renderHomeDoctors(homeDoctorsList);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bác sĩ:', error);
    }
}

function generateDoctorCardHTML(doc) {
    const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=random`;
    const imgSrc = doc.anh_dai_dien && doc.anh_dai_dien.trim() !== "" ? doc.anh_dai_dien : defaultImg;

    return `
        <div class="doctor-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px; width: 280px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: #fff;">
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${defaultImg}';" alt="${doc.ho_ten}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #f3f4f6;">
            <h3 style="font-size: 18px; margin: 0 0 10px 0; color: #1f2937;">${doc.ho_ten}</h3>
            <p style="color: #0284c7; font-weight: 600; margin: 0 0 8px 0; font-size: 15px;"><i class="fa-solid fa-stethoscope"></i> ${doc.ten_chuyen_khoa || 'Chưa cập nhật'}</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">Kinh nghiệm: ${doc.nam_kinh_nghiem || 0} năm</p>
            <p style="color: #ef4444; font-weight: bold; font-size: 16px; margin: 0 0 15px 0;">${formatCurrency(doc.phi_kham)}</p>
            <div style="display: flex; gap: 10px;">
                <button onclick="showDoctorDetails(${doc.id})" style="background-color: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; font-weight: 600; transition: background 0.3s;">Chi tiết</button>
                
                <button onclick="bookDoctor(${doc.id}, event)" style="background-color: #0284c7; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; font-weight: 600; transition: background 0.3s;">Đặt Lịch</button>
            </div>
        </div>
    `;
}

function renderHomeDoctors(doctors) {
    const container = document.getElementById('doctor-list-container');
    if (!container) return; 

    container.innerHTML = ''; 

    const activeDoctors = doctors.filter(doc => doc.trang_thai == 1);

    if (activeDoctors.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; width: 100%;">Hiện tại chưa có bác sĩ nào.</p>';
        renderAllDoctors([]);
        return;
    }

    // Trang chủ chỉ hiển thị tối đa 4 bác sĩ
    const homeDocs = activeDoctors.slice(0, 4);
    container.innerHTML = homeDocs.map(generateDoctorCardHTML).join('');

    // Đồng thời đổ toàn bộ dữ liệu vào trang ẩn "Tất cả bác sĩ"
    renderAllDoctors(activeDoctors);
}

function renderAllDoctors(activeDoctors) {
    const container = document.getElementById('all-doctors-list-container');
    if (!container) return;
    
    if (activeDoctors.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; width: 100%;">Chưa có bác sĩ nào.</p>';
        return;
    }
    container.innerHTML = activeDoctors.map(generateDoctorCardHTML).join('');
}

function showAllDoctors(event) {
    if (event) event.preventDefault();
    if(document.getElementById('main-home-content')) document.getElementById('main-home-content').style.display = 'none';
    if(document.getElementById('post-detail-view')) document.getElementById('post-detail-view').style.display = 'none';
    if(document.getElementById('all-posts-view')) document.getElementById('all-posts-view').style.display = 'none';
    
    if(document.getElementById('all-doctors-view')) document.getElementById('all-doctors-view').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDoctorDetails(id) {
    const doc = homeDoctorsList.find(d => d.id === id);
    if (!doc) return;

    // Cập nhật thông tin vào modal
    document.getElementById('detail_doc_name').innerText = doc.ho_ten;
    document.getElementById('detail_doc_spec').innerText = doc.ten_chuyen_khoa || 'Chưa cập nhật';
    document.getElementById('detail_doc_exp').innerText = (doc.nam_kinh_nghiem || 0) + ' năm';
    document.getElementById('detail_doc_price').innerText = formatCurrency(doc.phi_kham);
    document.getElementById('detail_doc_bio').innerHTML = doc.tieu_su ? doc.tieu_su.replace(/\n/g, '<br>') : 'Bác sĩ chưa cập nhật tiểu sử.';

    const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=random`;
    document.getElementById('detail_doc_img').src = doc.anh_dai_dien && doc.anh_dai_dien.trim() !== "" ? doc.anh_dai_dien : defaultImg;

    // Hiển thị modal
    document.getElementById('doctorDetailModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDoctorDetailsModal() {
    const modal = document.getElementById('doctorDetailModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function formatCurrency(amount) {
    if (!amount) return "0 VNĐ";
    return Number(amount).toLocaleString('en-US') + ' VNĐ';
}

// Chạy hàm tải dữ liệu ngay khi trang HTML đã render xong
document.addEventListener('DOMContentLoaded', fetchHomeDoctors);



// HÀM XỬ LÝ KHI BẤM NÚT "ĐẶT LỊCH" TRÊN THẺ BÁC SĨ MẶT TIỀN
function bookDoctor(id, event) {
    if (event) event.preventDefault();

    // Kiểm tra xem đã có dữ liệu đăng nhập trong máy chưa
    const userInfoString = localStorage.getItem('userInfo');

    if (!userInfoString) {
        // CHƯA ĐĂNG NHẬP: Bật bảng thông báo yêu cầu Đăng nhập / Đăng ký
        if (typeof requireLoginToBook === 'function') {
            requireLoginToBook(event);
        } else {
            alert("Vui lòng đăng nhập để đặt lịch khám!"); 
        }
    } else {
        // ĐÃ ĐĂNG NHẬP: Bay thẳng sang trang form điền Đặt lịch
        window.location.href = 'appointment.html';
    }
}