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

    // Logic hiển thị Sao: Nếu chưa ai đánh giá thì mờ đi, nếu có thì hiện màu vàng
    const ratingDisplay = doc.luot_danh_gia > 0 
        ? `<span style="color: #f59e0b;"><i class="fa-solid fa-star"></i> ${doc.diem_danh_gia}</span> <span style="color: #64748b; font-size: 12px; font-weight: 500;">(${doc.luot_danh_gia})</span>`
        : `<span style="color: #94a3b8; font-size: 12px; font-weight: 500;">Chưa có đánh giá</span>`;

    return `
        <div class="doctor-card" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 15px; width: 280px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); background: #fff; transition: 0.3s; display: flex; flex-direction: column;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="background: #0284c7; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">Đang làm việc</span>
                <div style="font-size: 14px; font-weight: 700;">
                    ${ratingDisplay}
                </div>
            </div>

            <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                <img src="${imgSrc}" onerror="this.onerror=null; this.src='${defaultImg}';" alt="${doc.ho_ten}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #f0f9ff;">
            </div>

            <h3 style="font-size: 17px; margin: 0 0 5px 0; color: #0f172a; text-align: left;">${doc.ho_ten}</h3>
            <p style="color: #0284c7; font-weight: 600; margin: 0 0 5px 0; font-size: 14px; text-align: left;">${doc.ten_chuyen_khoa || 'Chưa cập nhật'}</p>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0; text-align: left;">${doc.nam_kinh_nghiem || 0} năm kinh nghiệm</p>
            
            <div style="display: flex; gap: 10px; margin-top: auto;">
                <button onclick="showDoctorDetails(${doc.id})" style="background-color: #f8fafc; color: #334155; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: 600; transition: 0.2s;">Chi tiết</button>
                <button onclick="bookDoctor(${doc.id}, event)" style="background-color: #0284c7; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; flex: 1; font-weight: 600; transition: 0.2s;">Đặt Lịch</button>
            </div>
        </div>
    `;
}

function renderHomeDoctors(doctors) {
    const container = document.getElementById('doctor-list-container');
    if (!container) return; 

    container.innerHTML = ''; 

    const activeDoctors = doctors.filter(doc => doc.trang_thai !== 0 && doc.trang_thai !== false);

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

    // Cập nhật sự kiện cho nút "Đặt lịch khám" trong Modal để truyền đúng ID Bác sĩ
    const modalBookBtn = document.querySelector('#doctorDetailModal .btn-primary');
    if (modalBookBtn) {
        modalBookBtn.onclick = (e) => bookDoctor(id, e);
    }
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



// ====================================================================
// HÀM XỬ LÝ KHI BẤM NÚT "ĐẶT LỊCH" TRÊN THẺ BÁC SĨ MẶT TIỀN (ĐÃ FIX LỖI)
// ====================================================================
function bookDoctor(id, event) {
    if (event) event.preventDefault();
    
    // Kiểm tra xem đã có dữ liệu đăng nhập trong máy chưa
    const userInfoString = localStorage.getItem('userInfo');

    if (!userInfoString) {
        // CHƯA ĐĂNG NHẬP: Bật Popup thông báo y hệt Ảnh 3
        Swal.fire({
            icon: 'info',
            title: 'Yêu cầu tài khoản',
            text: 'Bạn cần đăng nhập hoặc tạo tài khoản mới để có thể đặt lịch khám bệnh!',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-user-plus"></i> Đăng ký ngay',
            cancelButtonText: '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#0284c7'
        }).then((result) => {
            if (result.isConfirmed) {
            window.location.href = '../auth/login.html';
            } else if (result.dismiss === Swal.DismissReason.cancel) {
            window.location.href = '../auth/login.html';
            }
        });
    } else {
        // ĐÃ ĐĂNG NHẬP: Lưu ID Bác sĩ lại để lát nữa Auto-Click
        localStorage.setItem('pendingBookingDoctorId', id);
        
        // Kiểm tra xem đang ở trang chủ (index.html) hay trang bệnh nhân (patient.html)
        if (window.location.pathname.includes('patient.html')) {
            // Đang ở sẵn trang bệnh nhân -> Mở tab Đặt lịch
            switchTab(null, 'tab-dat-lich');
            closeDoctorDetailsModal(); // Đóng form chi tiết (nếu đang mở)
            
            // Auto click vào bác sĩ
            setTimeout(() => {
                const docCard = document.getElementById(`doc-card-${id}`);
                if (docCard) {
                    docCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    docCard.click();
                }
                localStorage.removeItem('pendingBookingDoctorId'); // Xóa cache
            }, 300);
        } else {
            // Đang ở trang chủ ngoài cùng -> Nhảy sang trang patient.html
            window.location.href = 'patient/patient.html'; 
        }
    }
}