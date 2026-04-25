let allDoctors = [];
let allShifts = [];
let bookingData = {
    chuyen_khoa_id: null,
    chuyen_khoa_ten: '',
    bac_si_id: null,
    bac_si_ten: '',
    ngay_kham: '',
    gio_kham: ''
};

// ======================================================
// KHỞI TẠO VÀ TẢI DỮ LIỆU (BƯỚC 1)
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load Chuyên khoa cho Bước 1
    try {
        const resCK = await fetch('http://localhost:3000/api/specialties');
        const specialties = await resCK.json();
        const selectCK = document.getElementById('select_chuyen_khoa');
        if (selectCK) {
            specialties.forEach(sp => {
                selectCK.innerHTML += `<option value="${sp.id}">${sp.ten_chuyen_khoa}</option>`;
            });
        }

        // Tải toàn bộ Bác sĩ và Ca làm việc
        const resDoc = await fetch('http://localhost:3000/api/doctors');
        allDoctors = await resDoc.json();
        
        try {
            const resShift = await fetch('http://localhost:3000/api/doctors/shifts');
            if (resShift.ok) {
                allShifts = await resShift.json();
            } else {
                console.warn('API /api/doctors/shifts lỗi 404. Vui lòng kiểm tra Backend.');
            }
        } catch (shiftErr) {
            console.warn('Không thể tải dữ liệu ca làm việc:', shiftErr);
        }

        filterDoctorsBySpecialty(); // Render danh sách bác sĩ ban đầu
    } catch (error) {
        console.error('Lỗi khởi tạo dữ liệu đặt lịch:', error);
    }

    // Lắng nghe sự kiện đổi ngày ở Bước 2
    const dateInput = document.getElementById('booking_date');
    if (dateInput) {
        // Chỉ cho phép chọn ngày từ hôm nay trở đi
        dateInput.min = new Date().toISOString().split("T")[0];
        dateInput.addEventListener('change', loadTimeSlots);
    }
});

// Lọc và Hiển thị Bác sĩ (Xử lý làm mờ Bác sĩ không có lịch)
function filterDoctorsBySpecialty() {
    const specialtyId = document.getElementById('select_chuyen_khoa').value;
    const container = document.getElementById('doctor-selection-list');
    container.innerHTML = '';

    let filteredDoctors = allDoctors;
    if (specialtyId) {
        filteredDoctors = allDoctors.filter(doc => doc.chuyen_khoa_id == specialtyId);
    }

    if (filteredDoctors.length === 0) {
        container.innerHTML = '<p style="color: #64748b; width: 100%; text-align: center;">Không có bác sĩ nào thuộc chuyên khoa này.</p>';
        return;
    }

    filteredDoctors.forEach(doc => {
        // THEO LOGIC MỚI: Luôn sáng thẻ Bác sĩ để chọn ở Bước 1
        const cardStyle = 'cursor: pointer; border: 1px solid #e2e8f0;';
        const statusHtml = `<div style="color: #10b981; font-size: 12px; margin-top: 5px;"><i class="fa-solid fa-user-doctor"></i> Cho phép đặt lịch</div>`;
        
        // Xử lý logic ảnh Base64 hoặc Ảnh Server để tránh lỗi 431
        let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=0284c7&color=fff`;
        if (doc.anh_dai_dien) {
            if (doc.anh_dai_dien.startsWith('data:image') || doc.anh_dai_dien.startsWith('http')) {
                avatar = doc.anh_dai_dien;
            } else {
                avatar = `http://localhost:3000/uploads/${doc.anh_dai_dien}`;
            }
        }

        const phiKham = doc.phi_kham ? Number(doc.phi_kham).toLocaleString('vi-VN') + ' VNĐ' : 'Chưa cập nhật';

        container.innerHTML += `
            <div class="doctor-card" style="${cardStyle} padding: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; transition: 0.2s;" onclick="selectDoctor(${doc.id}, '${doc.ho_ten}', '${doc.ten_chuyen_khoa || 'Đa khoa'}', this)">
                <img src="${avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                <div>
                    <h4 style="margin: 0; color: #0f172a;">BS. ${doc.ho_ten}</h4>
                    <p style="margin: 3px 0 0 0; font-size: 13px; color: #64748b;">${doc.ten_chuyen_khoa || 'Đa khoa'}</p>
                    <p style="margin: 3px 0 0 0; font-size: 14px; font-weight: 600; color: #ef4444;">Phí khám: ${phiKham}</p>
                    ${statusHtml}
                </div>
            </div>
        `;
    });
}

function selectDoctor(id, name, specialtyName, element) {
    document.querySelectorAll('.doctor-card').forEach(el => el.style.borderColor = '#e2e8f0');
    element.style.borderColor = '#0284C7';
    element.style.background = '#F0F9FF';

    bookingData.bac_si_id = id;
    bookingData.bac_si_ten = name;
    bookingData.chuyen_khoa_ten = specialtyName;
}

// ======================================================
// XỬ LÝ CHIA NHỎ GIỜ VÀ KHÓA GIỜ (BƯỚC 2)
// ======================================================
function generateTimeSlots(startStr, endStr) {
    let slots = [];
    let start = new Date(`1970-01-01T${startStr}:00`);
    let end = new Date(`1970-01-01T${endStr}:00`);
    while (start < end) {
        let next = new Date(start.getTime() + 30 * 60000); // Tăng 30 phút
        if (next > end) break;
        let formatTime = (date) => date.toTimeString().substring(0, 5);
        slots.push(`${formatTime(start)} - ${formatTime(next)}`);
        start = next;
    }
    return slots;
}

async function loadTimeSlots() {
    const dateVal = document.getElementById('booking_date').value;
    const timeGrid = document.querySelector('.time-slots-grid');
    if (!dateVal || !bookingData.bac_si_id) return;

    timeGrid.innerHTML = '<p>Đang tải giờ khám...</p>';

    // Tìm ca làm việc của Bác sĩ trong ngày đã chọn
    const shift = allShifts.find(s => s.bac_si_id == bookingData.bac_si_id && s.ngay_lam_viec.startsWith(dateVal));
    
    if (!shift) {
        timeGrid.innerHTML = '<p style="color: #ef4444; width: 100%;">Bác sĩ không có lịch làm việc trong ngày này.</p>';
        bookingData.gio_kham = '';
        return;
    }

    // Chia nhỏ khung giờ gốc
    const [start, end] = shift.khung_gio.split(' - ');
    const allSlots = generateTimeSlots(start, end);

    // Lấy giờ hiện tại để làm mờ các giờ trong quá khứ của ngày hôm nay
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset() * 60000;
    const todayStr = new Date(localDate.getTime() - offset).toISOString().split('T')[0];
    const currentTimeStr = localDate.toTimeString().substring(0, 5); // "HH:MM"

    // Gọi API lấy danh sách các giờ đã được đặt của bác sĩ này trong ngày hôm đó
    try {
        const res = await fetch(`http://localhost:3000/api/appointments/booked?bac_si_id=${bookingData.bac_si_id}&ngay=${dateVal}`);
        
        let bookedSlots = [];
        if (res.ok) {
            bookedSlots = await res.json(); // Trả về mảng ví dụ: ["08:00 - 08:30"]
        } else {
            console.error('Lỗi từ server:', await res.text());
        }

        timeGrid.innerHTML = '';
        allSlots.forEach(slot => {
            const slotStart = slot.split(' - ')[0];
            const isPast = (dateVal === todayStr && slotStart < currentTimeStr);

            if (bookedSlots.includes(slot)) {
                // Bị khóa
                timeGrid.innerHTML += `<div class="time-slot" style="background: #f1f5f9; color: #94a3b8; pointer-events: none; border-color: #e2e8f0;">${slot} (Kín)</div>`;
            } else if (isPast) {
                // Bị khóa do đã qua giờ hiện tại
                timeGrid.innerHTML += `<div class="time-slot" style="background: #f8fafc; color: #cbd5e1; pointer-events: none; border-color: #e2e8f0; text-decoration: line-through;" title="Đã qua giờ này">${slot}</div>`;
            } else {
                // Khả dụng
                timeGrid.innerHTML += `<div class="time-slot" onclick="selectTimeSlot(this, '${slot}')">${slot}</div>`;
            }
        });
    } catch (error) {
        console.error('Lỗi tải giờ khám:', error);
        timeGrid.innerHTML = '<p style="color: red;">Lỗi hệ thống khi tải giờ khám.</p>';
    }
}

function selectTimeSlot(element, slot) {
    document.querySelectorAll('.time-slot').forEach(el => {
        if (el.style.pointerEvents !== 'none') {
            el.style.background = 'white';
            el.style.color = '#334155';
            el.style.borderColor = '#e2e8f0';
        }
    });
    element.style.background = '#0284C7';
    element.style.color = 'white';
    element.style.borderColor = '#0284C7';
    
    bookingData.gio_kham = slot;
}

// ======================================================
// ĐIỀU HƯỚNG CÁC BƯỚC (NEXT STEP)
// ======================================================
function nextStep(step) {
    // Validate Bước 1
    if (step === 2 && !bookingData.bac_si_id) {
        Swal.fire('Lỗi', 'Vui lòng chọn bác sĩ trước khi tiếp tục!', 'warning');
        return;
    }
    // Validate Bước 2
    if (step === 3) {
        bookingData.ngay_kham = document.getElementById('booking_date').value;
        if (!bookingData.ngay_kham || !bookingData.gio_kham) {
            Swal.fire('Lỗi', 'Vui lòng chọn ngày và giờ khám!', 'warning');
            return;
        }
        // Điền sẵn thông tin ở Bước 3
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        document.getElementById('bk_ten').value = userInfo.ho_ten || userInfo.ten_dang_nhap || '';
        document.getElementById('bk_sdt').value = userInfo.so_dien_thoai || '';
        document.getElementById('bk_email').value = userInfo.email || '';
    }
    // Validate Bước 3 và đẩy sang Bước 4 (Xác nhận)
    if (step === 4) {
        const trieuChung = document.getElementById('bk_trieu_chung').value;
        if (!trieuChung) {
            Swal.fire('Lỗi', 'Vui lòng nhập triệu chứng / lý do khám!', 'warning');
            return;
        }
        
        // Đổ dữ liệu ra Bước 4
        document.getElementById('cf_chuyen_khoa').innerText = bookingData.chuyen_khoa_ten;
        document.getElementById('cf_bac_si').innerText = 'BS. ' + bookingData.bac_si_ten;
        
        const dateObj = new Date(bookingData.ngay_kham);
        document.getElementById('cf_ngay').innerText = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        document.getElementById('cf_gio').innerText = bookingData.gio_kham;
        
        document.getElementById('cf_benh_nhan').innerText = document.getElementById('bk_ten').value;
        document.getElementById('cf_sdt').innerText = document.getElementById('bk_sdt').value;
        document.getElementById('cf_email').innerText = document.getElementById('bk_email').value;
        document.getElementById('cf_gioi_tinh').innerText = document.getElementById('bk_gt_nam').checked ? 'Nam' : 'Nữ';
        document.getElementById('cf_trieu_chung').innerText = trieuChung;
    }

    // UI chuyển Step
    document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`step-${step}`).classList.add('active');
    for(let i = 1; i <= step; i++) {
        document.getElementById(`step-nav-${i}`).classList.add('active');
    }
}

// ======================================================
// XÁC NHẬN VÀ LƯU DATABASE (BƯỚC 4)
// ======================================================
async function submitBooking() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    const payload = {
        benh_nhan_id: userInfo.id,
        bac_si_id: bookingData.bac_si_id,
        ngay_lam_viec: bookingData.ngay_kham,
        khung_gio: bookingData.gio_kham,
        mo_ta_trieu_chung: document.getElementById('bk_trieu_chung').value,
        ho_ten: document.getElementById('bk_ten').value,
        email: document.getElementById('bk_email').value
    };

    // Nút loading UI
    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong khi hệ thống lưu lịch và gửi Email.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const res = await fetch('http://localhost:3000/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            Swal.fire({
                title: 'Thành công!',
                text: 'Lịch khám của bạn đã được ghi nhận.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Cập nhật UI màn hình thành công
                document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
                document.getElementById('step-success').classList.add('active');
                
                document.getElementById('succ_bac_si').innerText = 'BS. ' + bookingData.bac_si_ten;
                document.getElementById('succ_chuyen_khoa').innerText = bookingData.chuyen_khoa_ten;
                
                const dateObj = new Date(bookingData.ngay_kham);
                document.getElementById('succ_ngay').innerText = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                document.getElementById('succ_gio').innerText = bookingData.gio_kham;
            });
        } else {
            Swal.fire('Lỗi', result.message || 'Lỗi đặt lịch!', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Lỗi', 'Không thể kết nối đến Server.', 'error');
    }
}

function resetBooking() {
    bookingData = { chuyen_khoa_id: null, chuyen_khoa_ten: '', bac_si_id: null, bac_si_ten: '', ngay_kham: '', gio_kham: '' };
    document.getElementById('select_chuyen_khoa').value = '';
    document.getElementById('booking_date').value = '';
    document.querySelector('.time-slots-grid').innerHTML = '';
    document.getElementById('bk_trieu_chung').value = '';
    
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-nav-1').classList.add('active');
    
    document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    
    filterDoctorsBySpecialty();
}