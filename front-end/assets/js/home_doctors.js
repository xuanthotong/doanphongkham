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

async function showDoctorDetails(id) {
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

    // Gọi API Đổ dữ liệu Lời nhận xét
    const reviewsContainer = document.getElementById('detail_doc_reviews');
    if (reviewsContainer) {
        reviewsContainer.innerHTML = '<p style="color: #64748b; font-size: 14px; font-style: italic; text-align: center;">Đang tải đánh giá...</p>';
        try {
            const res = await fetch(`http://localhost:3000/api/doctors/${id}/reviews`);
            const reviews = await res.json();
            
            reviewsContainer.innerHTML = '';
            if (reviews.length === 0) {
                reviewsContainer.innerHTML = '<p style="color: #64748b; font-size: 14px; font-style: italic; text-align: center;">Bác sĩ này chưa có đánh giá nào.</p>';
            } else {
                reviews.forEach(review => {
                    const date = new Date(review.ngay_danh_gia);
                    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                    
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += `<i class="fa-solid fa-star" style="color: ${i <= review.so_sao ? '#f59e0b' : '#e2e8f0'}; font-size: 12px;"></i>`;
                    }

                    const content = review.noi_dung ? review.noi_dung : '<span style="color: #94a3b8; font-style: italic;">Không có nhận xét chi tiết</span>';
                    const chuCaiDau = review.ten_benh_nhan.charAt(0).toUpperCase();

                    reviewsContainer.innerHTML += `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="background: #cbd5e1; color: #475569; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 14px;">${chuCaiDau}</div>
                                    <div><div style="font-weight: 600; font-size: 14px; color: #0f172a;">${review.ten_benh_nhan}</div><div style="color: #64748b; font-size: 12px;">${dateStr}</div></div>
                                </div>
                                <div>${starsHtml}</div>
                            </div>
                            <div style="color: #334155; font-size: 14px; line-height: 1.5; margin-top: 10px;">${content}</div>
                        </div>
                    `;
                });
            }
        } catch (error) { console.error(error); reviewsContainer.innerHTML = '<p style="color: #ef4444; font-size: 14px; text-align: center;">Lỗi khi tải đánh giá.</p>'; }
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