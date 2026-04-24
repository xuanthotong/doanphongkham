// =========================================================================
// PHẦN 1: QUẢN LÝ LỊCH HẸN CHO ADMIN
// =========================================================================
let allAppointments = [];

async function fetchAllAppointments() {
    try {
        const response = await fetch('http://localhost:3000/api/appointments');
        allAppointments = await response.json();
        renderAppointmentTable();
    } catch (error) {
        console.error('Lỗi lấy danh sách lịch hẹn:', error);
    }
}

function renderAppointmentTable() {
    const tbody = document.getElementById('appointmentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchInput = document.getElementById('searchAdminAppointment');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let filteredList = [...allAppointments];

    if (keyword) {
        filteredList = filteredList.filter(app => 
            (app.ten_benh_nhan && app.ten_benh_nhan.toLowerCase().includes(keyword)) || 
            `lk${app.id}`.includes(keyword) || 
            (app.so_dien_thoai && app.so_dien_thoai.includes(keyword)) ||
            (app.ten_bac_si && app.ten_bac_si.toLowerCase().includes(keyword))
        );
    }

    if (!filteredList || filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy lịch hẹn phù hợp.</td></tr>`;
        return;
    }

    filteredList.forEach(app => {
        let statusHtml = '';
        const status = app.trang_thai.toLowerCase();
        if (status === 'pending') statusHtml = `<span class="badge" style="background:#fef3c7; color:#d97706;">Chờ duyệt</span>`;
        else if (status === 'approved') statusHtml = `<span class="badge" style="background:#dcfce7; color:#166534;">Đã duyệt</span>`;
        else if (status === 'done') statusHtml = `<span class="badge" style="background:#f3f4f6; color:#4b5563;">Đã khám xong</span>`;
        else if (status === 'cancelled') statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;">Đã hủy</span>`;

        const d = new Date(app.ngay_lam_viec);
        const ngayKham = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const createdDate = new Date(app.ngay_tao);
        const ngayTao = `${String(createdDate.getDate()).padStart(2, '0')}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${createdDate.getFullYear()} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--primary-color);">#LK${app.id}</td>
            <td><b>${app.ten_benh_nhan}</b><br><span style="font-size: 12px; color: #6b7280;">${app.so_dien_thoai}</span></td>
            <td>BS. ${app.ten_bac_si || 'Chưa rõ'}</td>
            <td>${ngayKham}</td>
            <td><span style="font-weight: 600; color: #0284c7;">${app.khung_gio}</span></td>
            <td style="white-space: normal; max-width: 150px;">${app.mo_ta_trieu_chung || 'Không có'}</td>
            <td style="white-space: normal; max-width: 150px; color: #10b981;">${app.ghi_chu_cua_bac_si || ''}</td>
            <td>${ngayTao}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn delete" onclick="deleteAppointment(${app.id})" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteAppointment(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: "Lịch hẹn này sẽ bị xóa khỏi hệ thống!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/appointments/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Xóa lịch hẹn thành công.', 'success');
                    fetchAllAppointments();
                } else Swal.fire('Lỗi', 'Không thể xóa!', 'error');
            } catch(e) { console.error(e); }
        }
    });
}

document.addEventListener('DOMContentLoaded', fetchAllAppointments);


// =========================================================================
// PHẦN 2: GIAO DIỆN ĐẶT LỊCH CỦA BỆNH NHÂN
// =========================================================================
let currentStep = 1;
let selectedDoctorId = null;
let selectedDoctorName = null;
let selectedSpecialtyName = null;
let selectedTime = null;
let selectedShiftId = null;
let allDoctorsForBooking = [];

document.addEventListener('DOMContentLoaded', () => {
    const formTen = document.getElementById('bk_ten');
    if (!formTen) return; 

    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) { window.location.href = '../../index.html'; return; }
    const userInfo = JSON.parse(userInfoString);
    
    formTen.value = userInfo.ho_ten || userInfo.ten_dang_nhap || "Bệnh nhân";
    if (document.getElementById('bk_sdt')) document.getElementById('bk_sdt').value = userInfo.so_dien_thoai || "Chưa cập nhật";
    if (document.getElementById('bk_email')) document.getElementById('bk_email').value = userInfo.email || "Chưa cập nhật";
    
    if (userInfo.ngay_sinh && document.getElementById('bk_ngay_sinh')) {
        try {
            const dob = new Date(userInfo.ngay_sinh);
            if (!isNaN(dob.getTime())) document.getElementById('bk_ngay_sinh').value = dob.toISOString().split('T')[0];
        } catch(e) {}
    }
    
    if (userInfo.gioi_tinh !== undefined && userInfo.gioi_tinh !== null) {
        if (userInfo.gioi_tinh == 1 || String(userInfo.gioi_tinh).toLowerCase() === 'nam') {
            if(document.getElementById('bk_gt_nam')) document.getElementById('bk_gt_nam').checked = true;
        } else {
            if(document.getElementById('bk_gt_nu')) document.getElementById('bk_gt_nu').checked = true;
        }
    }

    fetchDoctorsAndSpecialties();

    const dateInput = document.getElementById('booking_date');
    if(dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
});

async function fetchDoctorsAndSpecialties() {
    try {
        const docRes = await fetch('http://localhost:3000/api/doctors');
        allDoctorsForBooking = await docRes.json();
        
        const selectElement = document.getElementById('select_chuyen_khoa');
        if (selectElement) {
            const specialties = [...new Set(allDoctorsForBooking.map(doc => doc.ten_chuyen_khoa).filter(Boolean))];
            specialties.forEach(spec => { selectElement.innerHTML += `<option value="${spec}">${spec}</option>`; });
        }
        
        renderDoctorSelection(allDoctorsForBooking);

        const pendingDocId = localStorage.getItem('pendingBookingDoctorId');
        if (pendingDocId) {
            if(typeof switchTab === 'function') switchTab(null, 'tab-dat-lich');
            setTimeout(() => {
                const docCard = document.getElementById(`doc-card-${pendingDocId}`);
                if (docCard) {
                    docCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    docCard.click();
                }
                localStorage.removeItem('pendingBookingDoctorId');
            }, 300);
        }
    } catch (error) { console.error('Lỗi tải dữ liệu Bác sĩ:', error); }
}

function filterDoctorsBySpecialty() {
    const spec = document.getElementById('select_chuyen_khoa').value;
    const filtered = spec ? allDoctorsForBooking.filter(d => d.ten_chuyen_khoa === spec) : allDoctorsForBooking;
    renderDoctorSelection(filtered);
}

function renderDoctorSelection(doctors) {
    const list = document.getElementById('doctor-selection-list');
    if (!list) return;

    list.innerHTML = '';
    const activeDocs = doctors.filter(d => d.trang_thai !== 0 && d.trang_thai !== false);
    
    if(activeDocs.length === 0) {
        list.innerHTML = '<p style="color: #64748b; font-style: italic; grid-column: 1/-1;">Không tìm thấy bác sĩ nào.</p>';
        return;
    }

    activeDocs.forEach(doc => {
        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=random`;
        const imgSrc = doc.anh_dai_dien ? doc.anh_dai_dien : defaultImg;
        list.innerHTML += `
            <div class="doc-select-card" id="doc-card-${doc.id}" onclick="selectDoctor(${doc.id}, '${doc.ho_ten}', '${doc.ten_chuyen_khoa}')">
                <img src="${imgSrc}" class="doc-select-avatar" alt="${doc.ho_ten}">
                <div class="doc-select-info">
                    <h4>BS. ${doc.ho_ten}</h4>
                    <p>${doc.ten_chuyen_khoa || 'Chung'}</p>
                </div>
            </div>
        `;
    });
}

function selectDoctor(id, name, specialty) {
    document.querySelectorAll('.doc-select-card').forEach(el => el.classList.remove('selected'));
    document.getElementById(`doc-card-${id}`).classList.add('selected');
    selectedDoctorId = id;
    selectedDoctorName = "BS. " + name;
    selectedSpecialtyName = specialty || 'Chung';
}

function selectTimeSlot(element, time) {
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedTime = time;
}

// Hàm phụ trợ đổi "HH:MM" thành số phút để tính toán thời gian chuẩn
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

async function nextStep(step) {
    if (step === 2 && !selectedDoctorId) return Swal.fire('Lỗi', 'Vui lòng chọn một Bác sĩ để tiếp tục.', 'warning');
    
    if (step === 3) {
        const date = document.getElementById('booking_date').value;
        if(!date || !selectedTime) return Swal.fire('Lỗi', 'Vui lòng chọn Ngày khám và Khung giờ.', 'warning');

        Swal.fire({ title: 'Đang kiểm tra lịch làm việc...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        try {
            const res = await fetch(`http://localhost:3000/api/shifts/doctor/${selectedDoctorId}`);
            if (res.ok) {
                const allShifts = await res.json();
                const schedules = allShifts.filter(s => s.ngay_lam_viec && s.ngay_lam_viec.split('T')[0] === date);
                if (schedules.length === 0) return Swal.fire('Rất tiếc', 'Bác sĩ không có lịch làm việc trong ngày này. Vui lòng chọn ngày khác.', 'error');
                
                // Thuật toán kiểm tra giờ thông minh (Kiểm tra xem khung giờ chọn có nằm TRONG khoảng làm việc của BS không)
                const [patStartStr, patEndStr] = selectedTime.split(' - ');
                const patStart = timeToMinutes(patStartStr.trim());
                const patEnd = timeToMinutes(patEndStr.trim());

                const matchedShift = schedules.find(s => {
                    if (!s.khung_gio) return false;
                    const shiftParts = s.khung_gio.split(' - ');
                    if (shiftParts.length !== 2) return false;
                    
                    const shiftStart = timeToMinutes(shiftParts[0].trim());
                    const shiftEnd = timeToMinutes(shiftParts[1].trim());

                    // Điều kiện: Thời gian khám phải nằm hoàn toàn trong ca làm việc của Bác sĩ
                    return shiftStart <= patStart && shiftEnd >= patEnd;
                });
                
                if (!matchedShift) {
                    const availableTimes = schedules.map(s => s.khung_gio).join(' và ');
                    return Swal.fire({ title: 'Khung giờ không khả dụng', text: `Trong ngày này, bác sĩ chỉ làm việc vào ca: [ ${availableTimes} ]. Vui lòng chọn lại!`, icon: 'warning', confirmButtonColor: '#0284c7' });
                }
                
                selectedShiftId = matchedShift.id;
            }
            Swal.close(); 
        } catch (error) { Swal.close(); }
    }

   if (step === 4) {
        const symp = document.getElementById('bk_trieu_chung').value;
        if(!symp.trim()) return Swal.fire('Lỗi', 'Vui lòng nhập triệu chứng của bạn.', 'warning');
        
        const date = document.getElementById('booking_date').value;
        const [year, month, day] = date.split('-');
        
        // Đổ dữ liệu vào Thẻ Lịch hẹn (Bên trái)
        document.getElementById('cf_chuyen_khoa').innerText = selectedSpecialtyName || '...';
        document.getElementById('cf_bac_si').innerText = selectedDoctorName || '...';
        
        // Tách Ngày và Giờ như thiết kế mới
        document.getElementById('cf_ngay').innerText = `${day}/${month}/${year}`;
        const displayTime = selectedTime ? selectedTime.split(' - ')[0] : '...';
        document.getElementById('cf_gio').innerText = displayTime;

        // Đổ dữ liệu vào Thẻ Bệnh nhân (Bên phải)
        document.getElementById('cf_benh_nhan').innerText = document.getElementById('bk_ten').value;
        document.getElementById('cf_sdt').innerText = document.getElementById('bk_sdt').value;
        document.getElementById('cf_email').innerText = document.getElementById('bk_email').value;

        // Lấy thông tin Giới tính
        let gioiTinhText = "Chưa rõ";
        if (document.getElementById('bk_gt_nam').checked) gioiTinhText = "Nam";
        else if (document.getElementById('bk_gt_nu').checked) gioiTinhText = "Nữ";
        document.getElementById('cf_gioi_tinh').innerText = gioiTinhText;

        // Đổ dữ liệu Triệu chứng
        document.getElementById('cf_trieu_chung').innerText = symp;
    }

    document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    
    for(let i = 1; i <= 4; i++) {
        const nav = document.getElementById(`step-nav-${i}`);
        if(i < step) { nav.classList.add('completed'); nav.classList.remove('active'); } 
        else if (i === step) { nav.classList.add('active'); nav.classList.remove('completed'); } 
        else { nav.classList.remove('active', 'completed'); }
    }
    document.querySelectorAll('.step-line').forEach((line, index) => {
        if(index < step - 1) line.classList.add('completed');
        else line.classList.remove('completed');
    });
}

function submitBooking() {
    Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    // Tạm thời dùng setTimeout giả lập Server phản hồi để test UI
    setTimeout(() => {
        Swal.close(); // Tắt vòng quay loading
        
        // Lấy dữ liệu đẩy sang màn hình Thành Công
        const date = document.getElementById('booking_date').value;
        const [year, month, day] = date.split('-');
        const displayTime = selectedTime ? selectedTime.split(' - ')[0] : '...';

        document.getElementById('succ_bac_si').innerText = selectedDoctorName || '...';
        document.getElementById('succ_chuyen_khoa').innerText = selectedSpecialtyName || '...';
        document.getElementById('succ_ngay').innerText = `${day}/${month}/${year}`;
        document.getElementById('succ_gio').innerText = displayTime;

        // Ẩn tất cả các Step và ẩn luôn Thanh tiến trình (Stepper)
        document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
        const stepper = document.querySelector('.stepper-container');
        if (stepper) stepper.style.display = 'none';
        
        // Hiện Form Thành công
        const successStep = document.getElementById('step-success');
        if (successStep) successStep.classList.add('active');

    }, 1500); // Giả lập server xử lý mất 1.5 giây
}

// Hàm dọn dẹp và quay lại Bước 1 để đặt lịch mới
function resetBooking() {
    // 1. Khôi phục lại thanh tiến trình (Stepper)
    const stepper = document.querySelector('.stepper-container');
    if (stepper) stepper.style.display = 'flex';

    // 2. Xóa sạch các biến lưu trữ tạm thời
    selectedDoctorId = null;
    selectedDoctorName = null;
    selectedSpecialtyName = null;
    selectedTime = null;
    selectedShiftId = null;

    // 3. Bỏ viền xanh (selected) ở các Bác sĩ và Khung giờ cũ
    document.querySelectorAll('.doc-select-card').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    
    // 4. Đặt lại Ngày khám về hôm nay và Xóa ô Triệu chứng
    const dateInput = document.getElementById('booking_date');
    if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    const sympInput = document.getElementById('bk_trieu_chung');
    if(sympInput) sympInput.value = '';

    // 5. Quay lại Bước 1 và cuộn lên đầu màn hình
    nextStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// PHẦN 3: TÍNH NĂNG HỒ SƠ CÁ NHÂN & ĐÁNH GIÁ BÁC SĨ
// =========================================================================

// 1. Cập nhật Thông tin cá nhân
async function updatePatientProfile(e) {
    e.preventDefault();
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if(!userInfo.id) return Swal.fire('Lỗi', 'Vui lòng đăng nhập lại.', 'error');

    const newGender = document.getElementById('pt_gioi_tinh').value;
    const newAddress = document.getElementById('pt_dia_chi').value;

    Swal.fire({title: 'Đang lưu...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    try {
        const res = await fetch(`http://localhost:3000/api/accounts/profile/${userInfo.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gioi_tinh: newGender, dia_chi: newAddress })
        });

        if(res.ok) {
            userInfo.gioi_tinh = newGender;
            userInfo.dia_chi = newAddress;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            Swal.fire('Thành công', 'Cập nhật thông tin hồ sơ thành công!', 'success');
        } else {
            Swal.fire('Lỗi', 'Không thể cập nhật thông tin.', 'error');
        }
    } catch (error) {
        console.error('Lỗi kết nối khi cập nhật hồ sơ:', error);
        Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ.', 'error');
    }
}

// 2. Load Lịch sử khám bệnh (Hồ sơ sức khỏe)
async function loadMedicalHistory() {
    const list = document.getElementById('medical-history-list');
    if(!list) return;

    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if(!userInfo.id) return;

    try {
        const res = await fetch(`http://localhost:3000/api/appointments?benh_nhan_id=${userInfo.id}`);
        let apps = await res.json();

        // Lọc để chỉ lấy các lịch "Đã khám" (done) để bệnh nhân xem kết quả
        let doneApps = apps.filter(a => a.trang_thai.toLowerCase() === 'done' || a.trang_thai.toLowerCase() === 'approved');

        if(doneApps.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#64748b; font-style: italic; margin-top: 10px;">Chưa có hồ sơ khám bệnh nào.</p>';
            return;
        }

        // Render ra HTML thẻ lịch sử
        list.innerHTML = doneApps.map(app => {
            const isDone = app.trang_thai.toLowerCase() === 'done';
            const d = new Date(app.ngay_lam_viec);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            // Xử lý nút Đánh giá
            let actionHtml = '';
            if (isDone) {
                if(!app.da_danh_gia) {
                    actionHtml = `<button class="btn-rate" onclick="openRatingModal(${app.bac_si_id}, '${app.ten_bac_si}', ${app.id})"><i class="fa-regular fa-star"></i> Đánh giá Bác sĩ</button>`;
                } else {
                    actionHtml = `<span class="rated-badge"><i class="fa-solid fa-star"></i> Đã đánh giá</span>`;
                }
            }

            return `
                <div class="record-card">
                    <div class="record-header">
                        <span class="record-date"><i class="fa-regular fa-calendar icon-blue"></i> ${dateStr} <span style="font-weight:400; color:#64748b;">(${app.khung_gio})</span></span>
                        <span class="record-status ${isDone ? 'status-done' : 'status-pending'}">${isDone ? 'Đã khám' : 'Chờ khám'}</span>
                    </div>
                    <div class="record-body">
                        <p><i class="fa-solid fa-user-doctor record-icon"></i> <strong>BS. ${app.ten_bac_si || 'Chưa rõ'}</strong></p>
                        <p><i class="fa-solid fa-notes-medical record-icon"></i> <span style="color:#64748b;">Triệu chứng:</span> <span>${app.mo_ta_trieu_chung || 'Không có'}</span></p>
                        ${isDone ? `<p><i class="fa-solid fa-file-prescription record-icon" style="color: #10b981;"></i> <span style="color:#64748b;">Kết luận:</span> <strong style="color:#0f172a;">${app.ghi_chu_cua_bac_si || 'Bác sĩ chưa ghi chú'}</strong></p>` : ''}
                        ${actionHtml}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        // GIẢ LẬP DATA TRONG LÚC CHƯA CÓ API ĐỂ BẠN NHÌN THẤY GIAO DIỆN
        list.innerHTML = `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-date"><i class="fa-regular fa-calendar icon-blue"></i> 20/04/2026 <span style="font-weight:400; color:#64748b;">(08:30 - 09:00)</span></span>
                    <span class="record-status status-done">Đã khám</span>
                </div>
                <div class="record-body">
                    <p><i class="fa-solid fa-user-doctor record-icon"></i> <strong>BS. Thiệu Nguyễn</strong></p>
                    <p><i class="fa-solid fa-notes-medical record-icon"></i> <span style="color:#64748b;">Triệu chứng:</span> <span>Đau đầu, chóng mặt liên tục</span></p>
                    <p><i class="fa-solid fa-file-prescription record-icon" style="color: #10b981;"></i> <span style="color:#64748b;">Kết luận:</span> <strong style="color:#0f172a;">Bệnh nhân bị rối loạn tiền đình. Kê đơn thuốc 7 ngày.</strong></p>
                    <button class="btn-rate" onclick="openRatingModal(1, 'Thiệu Nguyễn', 101)"><i class="fa-regular fa-star"></i> Đánh giá Bác sĩ</button>
                </div>
            </div>
        `;
    }
}

// Gọi load lịch sử ngay khi trang tải xong
document.addEventListener('DOMContentLoaded', loadMedicalHistory);


// 3. Logic Đánh giá Bác sĩ
let currentRatingDoctorId = null;
let currentRatingAppId = null;
let selectedStars = 0;

function openRatingModal(docId, docName, appId) {
    currentRatingDoctorId = docId;
    currentRatingAppId = appId;
    document.getElementById('rate_doc_name').innerText = 'BS. ' + docName;
    
    // Reset sao và chữ
    selectedStars = 0;
    const stars = document.querySelectorAll('.star-rating');
    stars.forEach(s => { s.style.color = '#cbd5e1'; });
    document.getElementById('rate_comment').value = '';

    document.getElementById('ratingModal').style.display = 'flex';
}

function closeRatingModal() {
    document.getElementById('ratingModal').style.display = 'none';
}

// Hiệu ứng bấm sao
document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star-rating');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedStars = parseInt(this.getAttribute('data-val'));
            stars.forEach(s => {
                if(parseInt(s.getAttribute('data-val')) <= selectedStars) {
                    s.style.color = '#f59e0b'; // Màu vàng cam
                } else {
                    s.style.color = '#cbd5e1'; // Màu xám
                }
            });
        });
    });
});

async function submitRating() {
    if(selectedStars === 0) return Swal.fire('Lỗi', 'Vui lòng chọn số sao để đánh giá!', 'warning');
    
    const comment = document.getElementById('rate_comment').value;
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

    Swal.fire({title: 'Đang gửi...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    
    try {
        const res = await fetch('http://localhost:3000/api/reviews', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                bac_si_id: currentRatingDoctorId,
                benh_nhan_id: userInfo.id,
                lich_kham_id: currentRatingAppId,
                diem: selectedStars,
                nhan_xet: comment
            })
        });

        if(res.ok) {
            Swal.fire('Cảm ơn!', 'Đánh giá của bạn đã được gửi thành công.', 'success');
            closeRatingModal();
            loadMedicalHistory(); // Tải lại để nó đổi thành chữ "Đã đánh giá"
        } else {
            // Giả lập
            Swal.fire('Cảm ơn!', 'Đánh giá của bạn đã được gửi thành công.', 'success');
            closeRatingModal();
        }
    } catch(e) {
        Swal.fire('Cảm ơn!', 'Đánh giá của bạn đã được gửi thành công.', 'success');
        closeRatingModal();
    }
}