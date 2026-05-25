window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
// ======================================================
// BIẾN TOÀN CỤC
// ======================================================
let allDoctors = [];
let allShifts = [];
let allSpecialties = [];
let bookingMode = 'doctor'; // 'doctor' hoặc 'specialty'
let searchKeyword = '';
let symptomImagesBase64 = [];

let bookingData = {
    chuyen_khoa_id: null,
    chuyen_khoa_ten: '',
    bac_si_id: null,
    bac_si_ten: '',
    bac_si_avatar: '',
    ngay_kham: '',
    gio_kham: '',
    phi_kham: 0
};

const API_BASE = window.API_BASE + '';
const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// ======================================================
// KHỞI TẠO
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Tải song song: Chuyên khoa, Bác sĩ, Ca làm việc
        const [resCK, resDoc, resShift] = await Promise.all([
            fetch(`${API_BASE}/api/specialties`),
            fetch(`${API_BASE}/api/doctors`),
            fetch(`${API_BASE}/api/doctors/shifts`).catch(() => ({ ok: false }))
        ]);

        if (resCK.ok) allSpecialties = await resCK.json();
        if (resDoc.ok) allDoctors = await resDoc.json();
        if (resShift.ok) allShifts = await resShift.json();

        // Populate dropdown chuyên khoa sidebar
        const selectCK = document.getElementById('sidebar_chuyen_khoa');
        if (selectCK) {
            allSpecialties.forEach(sp => {
                selectCK.innerHTML += `<option value="${sp.id}">${sp.ten_chuyen_khoa}</option>`;
            });
        }

        // Populate người tới khám
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const selectNguoi = document.getElementById('sidebar_nguoi_kham');
        if (selectNguoi && userInfo.ho_ten) {
            selectNguoi.innerHTML = `<option value="${userInfo.id}" selected>${userInfo.ho_ten}</option>`;
        }

        // Set ngày mặc định: hôm nay → 10 ngày sau
        initDateRange();

        // Render danh sách bác sĩ
        renderDoctorCards();

        // KIỂM TRA FOCUS BÁC SĨ (Từ trang chủ click đặt lịch)
        const pendingDocId = localStorage.getItem('pendingBookingDoctorId');
        if (pendingDocId) {
            localStorage.removeItem('pendingBookingDoctorId');
            if (typeof switchTab === 'function') switchTab(null, 'tab-dat-lich');
            setTimeout(() => {
                const toggleBtn = document.getElementById(`bdc-toggle-${pendingDocId}`);
                if (toggleBtn) {
                    toggleBtn.click();
                    setTimeout(() => toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                }
            }, 400);
        }
    } catch (error) {
        console.error('Lỗi khởi tạo dữ liệu đặt lịch:', error);
    }
});

// ======================================================
// KHỞI TẠO KHOẢNG NGÀY
// ======================================================
function initDateRange() {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 9); // 10 ngày

    const startInput = document.getElementById('sidebar_date_start');
    const endInput = document.getElementById('sidebar_date_end');

    if (startInput) {
        startInput.min = toDateStr(today);
        startInput.value = toDateStr(today);
    }
    if (endInput) {
        endInput.min = toDateStr(today);
        endInput.value = toDateStr(end);
    }
}

function toDateStr(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ======================================================
// TẠO DANH SÁCH NGÀY TRONG KHOẢNG
// ======================================================
function getDateRange() {
    const startStr = document.getElementById('sidebar_date_start')?.value;
    const endStr = document.getElementById('sidebar_date_end')?.value;
    if (!startStr || !endStr) return [];

    const dates = [];
    let current = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// ======================================================
// CHUYỂN ĐỔI PHƯƠNG THỨC ĐẶT KHÁM
// ======================================================
function switchBookingMethod(mode, btn) {
    bookingMode = mode;

    // Toggle tab active
    document.querySelectorAll('.booking-method-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide chuyên khoa dropdown
    const specGroup = document.getElementById('sidebar-specialty-group');
    if (specGroup) {
        specGroup.style.display = mode === 'specialty' ? 'block' : 'none';
    }

    // Reset selection
    resetBookingSelection();
    renderDoctorCards();
}

// ======================================================
// XỬ LÝ SỰ KIỆN SIDEBAR
// ======================================================
function onSidebarSpecialtyChange() {
    resetBookingSelection();
    renderDoctorCards();
}

function onSidebarDateChange() {
    resetBookingSelection();
    renderDoctorCards();
}

function onBookingSearchInput() {
    searchKeyword = document.getElementById('booking_search_input')?.value?.toLowerCase() || '';
    renderDoctorCards();
}

// ======================================================
// RESET TRẠNG THÁI CHỌN
// ======================================================
function resetBookingSelection() {
    bookingData.bac_si_id = null;
    bookingData.bac_si_ten = '';
    bookingData.bac_si_avatar = '';
    bookingData.chuyen_khoa_id = null;
    bookingData.chuyen_khoa_ten = '';
    bookingData.ngay_kham = '';
    bookingData.gio_kham = '';
    bookingData.phi_kham = 0;
    updateSummary();
}

// ======================================================
// RENDER DANH SÁCH CARD BÁC SĨ
// ======================================================
function renderDoctorCards() {
    const container = document.getElementById('booking-doctor-list');
    if (!container) return;

    let doctors = [...allDoctors];
    const dateRange = getDateRange();

    // Lọc theo chuyên khoa (mode specialty)
    if (bookingMode === 'specialty') {
        const specId = document.getElementById('sidebar_chuyen_khoa')?.value;
        if (specId) {
            doctors = doctors.filter(d => d.chuyen_khoa_id == specId);
        }
    }

    // Lọc theo tìm kiếm
    if (searchKeyword) {
        doctors = doctors.filter(d => d.ho_ten.toLowerCase().includes(searchKeyword));
    }

    // Cập nhật count
    const countEl = document.getElementById('booking_doc_count');
    if (countEl) countEl.textContent = doctors.length;

    if (doctors.length === 0) {
        container.innerHTML = `
            <div class="booking-no-result">
                <i class="fa-solid fa-user-doctor"></i>
                <p>Không tìm thấy bác sĩ phù hợp.</p>
            </div>`;
        return;
    }

    let html = '';
    doctors.forEach(doc => {
        // Tìm các ca làm việc của bác sĩ trong khoảng ngày
        const docShifts = allShifts.filter(s => s.bac_si_id == doc.id);
        const hasAnyShift = dateRange.some(date => {
            const dateStr = toDateStr(date);
            return docShifts.some(s => s.ngay_lam_viec && s.ngay_lam_viec.startsWith(dateStr));
        });

        const isDisabled = !hasAnyShift;

        // Avatar
        let avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=0284c7&color=fff`;
        if (doc.anh_dai_dien) {
            if (doc.anh_dai_dien.startsWith('data:image') || doc.anh_dai_dien.startsWith('http')) {
                avatar = doc.anh_dai_dien;
            } else {
                avatar = `${API_BASE}/uploads/${doc.anh_dai_dien}`;
            }
        }

        const phiKham = doc.phi_kham ? Number(doc.phi_kham).toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ';

        // Tạo date chips
        let dateChipsHtml = '';
        dateRange.forEach(date => {
            const dateStr = toDateStr(date);
            const dayName = DAY_NAMES[date.getDay()];
            const dayDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const hasShift = docShifts.some(s => s.ngay_lam_viec && s.ngay_lam_viec.startsWith(dateStr));

            if (hasShift) {
                dateChipsHtml += `
                    <div class="booking-date-chip" onclick="selectDateChip(${doc.id}, '${dateStr}', this)" data-date="${dateStr}">
                        <span class="chip-day">${dayName}</span>
                        <span class="chip-date">${dayDate}</span>
                    </div>`;
            } else {
                dateChipsHtml += `
                    <div class="booking-date-chip chip-disabled">
                        <span class="chip-day">${dayName}</span>
                        <span class="chip-date">${dayDate}</span>
                    </div>`;
            }
        });

        html += `
            <div class="booking-doctor-card ${isDisabled ? 'disabled' : ''}" id="bdc-card-${doc.id}">
                <div class="bdc-header">
                    <img class="bdc-avatar" src="${avatar}" alt="${doc.ho_ten}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=0284c7&color=fff'">
                    <div class="bdc-info">
                        <h4>BS. ${doc.ho_ten}</h4>
                        <p class="bdc-specialty">Chuyên khoa: ${doc.ten_chuyen_khoa || 'Đa khoa'}</p>
                        <div class="bdc-fee-price">
                            <span class="bdc-fee-label">Giá khám:</span>
                            <span class="bdc-fee-value">${phiKham}</span>
                        </div>
                    </div>
                    <button class="bdc-toggle-btn" id="bdc-toggle-${doc.id}" 
                        onclick="toggleDoctorCard(${doc.id}, '${doc.ho_ten.replace(/'/g, "\\'")}', '${(doc.ten_chuyen_khoa || 'Đa khoa').replace(/'/g, "\\'")}', '${avatar.replace(/'/g, "\\'")}', ${doc.phi_kham || 0}, ${doc.chuyen_khoa_id || 0}, this)"
                        ${isDisabled ? 'disabled' : ''}>
                        ${isDisabled ? 'Không có lịch' : 'Chọn lịch'}
                    </button>
                </div>
                <div class="bdc-body" id="bdc-body-${doc.id}">
                    <p class="bdc-dates-title">Chọn ngày khám:</p>
                    <div class="booking-date-chips">${dateChipsHtml}</div>
                    <div id="bdc-timeslots-${doc.id}"></div>
                    <div id="bdc-clinic-${doc.id}"></div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// ======================================================
// TOGGLE MỞ/ĐÓNG CARD BÁC SĨ
// ======================================================
function toggleDoctorCard(docId, docName, specName, avatar, phiKham, ckId, btnEl) {
    const body = document.getElementById(`bdc-body-${docId}`);
    const card = document.getElementById(`bdc-card-${docId}`);
    if (!body || !card) return;

    // Đóng tất cả card khác
    document.querySelectorAll('.bdc-body.open').forEach(b => {
        if (b.id !== `bdc-body-${docId}`) {
            b.classList.remove('open');
            const otherCard = b.closest('.booking-doctor-card');
            if (otherCard) otherCard.classList.remove('selected-card');
            const otherBtn = otherCard?.querySelector('.bdc-toggle-btn');
            if (otherBtn) {
                otherBtn.textContent = 'Chọn lịch';
                otherBtn.classList.remove('active-toggle');
            }
        }
    });

    // Toggle card hiện tại
    const isOpen = body.classList.contains('open');
    if (isOpen) {
        body.classList.remove('open');
        card.classList.remove('selected-card');
        btnEl.textContent = 'Chọn lịch';
        btnEl.classList.remove('active-toggle');
        resetBookingSelection();
    } else {
        body.classList.add('open');
        card.classList.add('selected-card');
        btnEl.textContent = 'Đóng lịch';
        btnEl.classList.add('active-toggle');

        // Cập nhật booking data
        bookingData.bac_si_id = docId;
        bookingData.bac_si_ten = docName;
        bookingData.bac_si_avatar = avatar;
        bookingData.chuyen_khoa_ten = specName;
        bookingData.chuyen_khoa_id = ckId;
        bookingData.ngay_kham = '';
        bookingData.gio_kham = '';
        updateSummary();

        // Clear timeslots & clinic
        document.getElementById(`bdc-timeslots-${docId}`).innerHTML = '';
        document.getElementById(`bdc-clinic-${docId}`).innerHTML = '';
    }
}

// ======================================================
// CHỌN NGÀY TRÊN CHIP
// ======================================================
function selectDateChip(docId, dateStr, chipEl) {
    // Remove active từ tất cả chip trong card này
    const body = document.getElementById(`bdc-body-${docId}`);
    body.querySelectorAll('.booking-date-chip').forEach(c => c.classList.remove('chip-active'));
    chipEl.classList.add('chip-active');

    bookingData.ngay_kham = dateStr;
    bookingData.gio_kham = '';
    updateSummary();

    // Load time slots
    loadTimeSlotsForCard(docId, dateStr);

    // Show clinic info
    showClinicInfo(docId, dateStr);
}

// ======================================================
// TẢI GIỜ KHÁM CHO CARD BÁC SĨ
// ======================================================
async function loadTimeSlotsForCard(docId, dateStr) {
    const container = document.getElementById(`bdc-timeslots-${docId}`);
    if (!container) return;

    container.innerHTML = '<p style="color: #64748b; font-size: 13px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải giờ khám...</p>';

    // Tìm ca làm việc
    const shift = allShifts.find(s => s.bac_si_id == docId && s.ngay_lam_viec && s.ngay_lam_viec.startsWith(dateStr));
    if (!shift) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 13px;">Bác sĩ không có lịch làm việc trong ngày này.</p>';
        return;
    }

    // Chia nhỏ khung giờ
    const [start, end] = shift.khung_gio.split(' - ');
    const allSlots = generateTimeSlots(start, end);

    // Lấy giờ hiện tại
    const now = new Date();
    const todayStr = toDateStr(now);
    const currentTime = now.toTimeString().substring(0, 5);

    // Gọi API lấy slot đã đặt
    try {
        const res = await fetch(`${API_BASE}/api/appointments/booked?bac_si_id=${docId}&ngay=${dateStr}`);
        let bookedSlots = [];
        if (res.ok) bookedSlots = await res.json();

        let html = '<p class="bdc-timeslots-title"><i class="fa-regular fa-clock"></i> Chọn giờ khám:</p>';
        html += '<div class="bdc-timeslots-grid">';

        // Tính toán số người tối đa cho mỗi 30 phút (Slot)
        const maxPerSlot = Math.ceil(shift.so_luong_toi_da / Math.max(1, allSlots.length));
        const isShiftFull = (shift.so_luong_hien_tai >= shift.so_luong_toi_da) || (shift.trang_thai === 'Stopped');

        allSlots.forEach(slot => {
            const slotStart = slot.split(' - ')[0];
            const isPast = (dateStr === todayStr && slotStart < currentTime);
            const countBookedInSlot = bookedSlots.filter(s => s === slot).length;

            if (isShiftFull || countBookedInSlot >= maxPerSlot) {
                html += `<div class="bdc-time-slot slot-booked">${slot} (Kín)</div>`;
            } else if (isPast) {
                html += `<div class="bdc-time-slot slot-past" title="Đã qua giờ">${slot}</div>`;
            } else {
                html += `<div class="bdc-time-slot" onclick="selectTimeSlotNew(this, '${slot}')">${slot}</div>`;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi tải giờ khám:', error);
        container.innerHTML = '<p style="color: #ef4444; font-size: 13px;">Lỗi hệ thống khi tải giờ khám.</p>';
    }
}

function generateTimeSlots(startStr, endStr) {
    let slots = [];
    let start = new Date(`1970-01-01T${startStr}:00`);
    let end = new Date(`1970-01-01T${endStr}:00`);
    while (start < end) {
        let next = new Date(start.getTime() + 30 * 60000);
        if (next > end) break;
        let formatTime = (date) => date.toTimeString().substring(0, 5);
        slots.push(`${formatTime(start)} - ${formatTime(next)}`);
        start = next;
    }
    return slots;
}

// ======================================================
// CHỌN GIỜ KHÁM
// ======================================================
function selectTimeSlotNew(el, slot) {
    // Remove selected từ tất cả slot
    document.querySelectorAll('.bdc-time-slot').forEach(s => s.classList.remove('slot-selected'));
    el.classList.add('slot-selected');

    bookingData.gio_kham = slot;
    updateSummary();
}

// ======================================================
// HIỂN THỊ THÔNG TIN PHÒNG KHÁM
// ======================================================
function showClinicInfo(docId, dateStr) {
    const container = document.getElementById(`bdc-clinic-${docId}`);
    if (!container) return;

    const doc = allDoctors.find(d => d.id == docId);
    const specName = doc?.ten_chuyen_khoa || 'Đa khoa';

    // Format ngày hiển thị
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_NAMES[dateObj.getDay()];
    const formattedDate = `${dayName}, ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

    container.innerHTML = `
        <div class="bdc-clinic-info">
            <h5>Khoa Khám bệnh</h5>
            <div class="bdc-clinic-row">
                <i class="fa-solid fa-location-dot"></i>
                <span>Địa chỉ: Phòng khám TT Medical</span>
            </div>
            <div class="bdc-clinic-row">
                <i class="fa-solid fa-door-open"></i>
                <span>Phòng: Khoa ${specName}</span>
            </div>
            <div class="bdc-clinic-row">
                <i class="fa-regular fa-calendar"></i>
                <span>Ngày khám: ${formattedDate}</span>
            </div>
            <div class="bdc-clinic-row">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Chuyên khoa: ${specName}</span>
            </div>
        </div>`;
}

// ======================================================
// CẬP NHẬT SIDEBAR PHẢI (TÓM TẮT)
// ======================================================
function updateSummary() {
    // Doctor section
    const docSection = document.getElementById('summary-doctor-section');
    if (bookingData.bac_si_id) {
        docSection.style.display = 'block';
        document.getElementById('summary_doc_name').textContent = 'BS. ' + bookingData.bac_si_ten;
        document.getElementById('summary_doc_spec').textContent = bookingData.chuyen_khoa_ten;
        document.getElementById('summary_doc_avatar').src = bookingData.bac_si_avatar;
    } else {
        docSection.style.display = 'none';
    }

    // Ngày
    const dateEl = document.getElementById('summary_date');
    if (bookingData.ngay_kham) {
        const d = new Date(bookingData.ngay_kham + 'T00:00:00');
        dateEl.textContent = `${DAY_NAMES[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        dateEl.className = 'summary-value';
    } else {
        dateEl.textContent = 'Chưa chọn ngày';
        dateEl.className = 'summary-placeholder';
    }

    // Giờ
    const timeEl = document.getElementById('summary_time');
    if (bookingData.gio_kham) {
        timeEl.textContent = bookingData.gio_kham;
        timeEl.className = 'summary-value';
    } else {
        timeEl.textContent = 'Chưa chọn giờ';
        timeEl.className = 'summary-placeholder';
    }

    // Chuyên khoa
    const specEl = document.getElementById('summary_specialty');
    if (bookingData.chuyen_khoa_ten) {
        specEl.textContent = bookingData.chuyen_khoa_ten;
        specEl.className = 'summary-value';
    } else {
        specEl.textContent = 'Chưa chọn chuyên khoa';
        specEl.className = 'summary-placeholder';
    }

    // Khoa
    const deptEl = document.getElementById('summary_department');
    if (bookingData.chuyen_khoa_ten) {
        deptEl.textContent = 'Khoa ' + bookingData.chuyen_khoa_ten;
        deptEl.className = 'summary-value';
    } else {
        deptEl.textContent = 'Chưa chọn khoa';
        deptEl.className = 'summary-placeholder';
    }
}

// ======================================================
// XÁC NHẬN ĐẶT KHÁM → CHUYỂN SANG THANH TOÁN
// ======================================================
function confirmNewBooking() {
    // Validate
    if (!bookingData.bac_si_id) {
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn bác sĩ!', 'warning');
        return;
    }
    if (!bookingData.ngay_kham) {
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn ngày khám!', 'warning');
        return;
    }
    if (!bookingData.gio_kham) {
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn giờ khám!', 'warning');
        return;
    }

    const trieuChung = document.getElementById('summary_trieu_chung')?.value?.trim();
    if (!trieuChung) {
        Swal.fire('Thiếu thông tin', 'Vui lòng mô tả triệu chứng / lý do khám!', 'warning');
        return;
    }

    const nguoiKham = document.getElementById('sidebar_nguoi_kham')?.value;
    if (!nguoiKham) {
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn người tới khám!', 'warning');
        return;
    }

    // Ẩn booking view, hiện payment view
    document.getElementById('booking-main-view').style.display = 'none';
    document.getElementById('booking-payment-view').style.display = 'block';

    // Đảm bảo step-5 active
    document.querySelectorAll('#booking-payment-view .booking-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-5').classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ======================================================
// QUAY LẠI TỪ PAYMENT VỀ BOOKING VIEW
// ======================================================
function backToBookingView() {
    document.getElementById('booking-payment-view').style.display = 'none';
    document.getElementById('booking-main-view').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ======================================================
// XỬ LÝ THANH TOÁN (GIỮ NGUYÊN LOGIC CŨ)
// ======================================================
let pollingInterval = null;
let paymentCountdownInterval = null;
let currentPendingAppointmentId = null;

function processPayment() {
    submitBooking();
}

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

function startPaymentCountdown(durationInSeconds) {
    clearInterval(paymentCountdownInterval);
    const display = document.getElementById('countdown-timer');
    let timer = durationInSeconds;

    paymentCountdownInterval = setInterval(async () => {
        let minutes = parseInt(timer / 60, 10);
        let seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        if (display) display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(paymentCountdownInterval);
            clearInterval(pollingInterval);
            if (currentPendingAppointmentId) {
                await fetch(`${API_BASE}/api/appointments/${currentPendingAppointmentId}/unpaid`, { method: 'DELETE' });
                currentPendingAppointmentId = null;
            }
            Swal.fire({
                title: 'Hết thời gian!',
                text: 'Thời gian thanh toán đã hết. Lịch hẹn của bạn đã bị hủy.',
                icon: 'warning',
                confirmButtonText: 'Đóng'
            }).then(() => {
                backToStep5();
            });
        }
    }, 1000);
}

function backToStep5() {
    document.querySelectorAll('#booking-payment-view .booking-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-5').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function cancelUnpaidAndGoBack() {
    clearInterval(pollingInterval);
    clearInterval(paymentCountdownInterval);
    if (currentPendingAppointmentId) {
        try {
            await fetch(`${API_BASE}/api/appointments/${currentPendingAppointmentId}/unpaid`, { method: 'DELETE' });
            currentPendingAppointmentId = null;
        } catch (error) {
            console.error('Lỗi hủy lịch:', error);
        }
    }
    backToStep5();
}

// ======================================================
// GỬI DỮ LIỆU ĐẶT LỊCH
// ======================================================
async function submitBooking() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const paymentMethodElement = document.querySelector('input[name="payment_method"]:checked');
    const paymentMethod = paymentMethodElement ? paymentMethodElement.value : 'cash';
    const trieuChung = document.getElementById('summary_trieu_chung')?.value?.trim() || '';

    let finalSymptomText = trieuChung;
    if (symptomImagesBase64.length > 0) {
        const imagesStr = symptomImagesBase64.map(b64 => `<img src="${b64}" style="max-width:100px; max-height:100px; object-fit: cover; margin: 5px; border-radius: 4px; border: 1px solid #e2e8f0; cursor: pointer;" onclick="window.open('${b64}')">`).join('');
        finalSymptomText += `<br><div class="symptom-images-wrapper" style="display: flex; flex-wrap: wrap; margin-top: 10px;">${imagesStr}</div>`;
    }

    const payload = {
        benh_nhan_id: userInfo.id,
        bac_si_id: bookingData.bac_si_id,
        ngay_lam_viec: bookingData.ngay_kham,
        khung_gio: bookingData.gio_kham,
        mo_ta_trieu_chung: finalSymptomText,
        ho_ten: userInfo.ho_ten || '',
        email: userInfo.email || '',
        phuong_thuc_thanh_toan: paymentMethod
    };

    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong khi hệ thống lưu lịch và gửi Email.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const res = await fetch(`${API_BASE}/api/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            Swal.close();
            currentPendingAppointmentId = result.appointmentId;

            if (paymentMethod === 'cash') {
                showSuccessScreen();
            } else if (paymentMethod === 'transfer' || paymentMethod === 'momo') {
                document.querySelectorAll('#booking-payment-view .booking-step').forEach(el => el.classList.remove('active'));
                document.getElementById('step-6').classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });

                const patientNameNoAccent = removeVietnameseTones(payload.ho_ten).toUpperCase();
                const transferContent = `TTMED ${result.appointmentId} BN ${patientNameNoAccent}`;
                const amount = result.phi_kham;

                document.getElementById('pay-amount-text').innerText = Number(amount).toLocaleString('en-US');

                let qrUrl = '';
                if (paymentMethod === 'transfer') {
                    document.querySelector('#step-6 .step-title').innerText = 'Thanh toán chuyển khoản';
                    document.querySelector('#step-6 .step-desc').innerText = 'Vui lòng dùng ứng dụng Ngân hàng quét mã QR bên dưới.';
                    document.querySelector('#content-bank > div:first-child').innerText = 'Quét mã QR Ngân hàng';
                    document.querySelector('#content-bank > div:first-child').style.background = '#0284c7';
                    document.getElementById('content-bank').style.borderColor = '#cbd5e1';

                    const bankBin = "MB";
                    const bankAccount = "00003082058888";
                    const accountName = "TONG XUAN THO";
                    qrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;
                } else if (paymentMethod === 'momo') {
                    document.querySelector('#step-6 .step-title').innerText = 'Thanh toán qua Ví MoMo';
                    document.querySelector('#step-6 .step-desc').innerText = 'Vui lòng mở ứng dụng MoMo trên điện thoại và quét mã QR bên dưới.';
                    document.querySelector('#content-bank > div:first-child').innerText = 'Dùng App MoMo quét mã này';
                    document.querySelector('#content-bank > div:first-child').style.background = '#A50064';
                    document.getElementById('content-bank').style.borderColor = '#A50064';
                    qrUrl = `https://quickchart.io/qr?size=300&margin=2&text=${encodeURIComponent(result.payosQrCode)}`;
                }

                const qrImg = document.getElementById('dynamic-vietqr-img');
                const spinner = document.getElementById('qr-loading-spinner');
                qrImg.onload = () => { spinner.style.display = 'none'; qrImg.style.display = 'block'; };
                qrImg.src = qrUrl;

                startPaymentCountdown(30 * 60);
                pollingInterval = setInterval(() => { checkPaymentStatus(result.appointmentId); }, 3000);
            }
        } else {
            Swal.fire('Lỗi', result.message || 'Không thể lưu lịch hẹn lúc này.', 'error');
        }
    } catch (error) {
        Swal.fire('Lỗi', 'Hệ thống đang bảo trì, vui lòng thử lại sau.', 'error');
    }
}

// ======================================================
// CHECK TRẠNG THÁI THANH TOÁN (POLLING)
// ======================================================
async function checkPaymentStatus(appointmentId) {
    try {
        const res = await fetch(`${API_BASE}/api/appointments/${appointmentId}/payment-status`);
        if (res.ok) {
            const data = await res.json();
            if (data.paid === true) {
                clearInterval(pollingInterval);
                clearInterval(paymentCountdownInterval);
                showSuccessScreen();
                Swal.fire('Thanh toán thành công!', 'Hệ thống đã nhận được tiền và xác nhận lịch hẹn.', 'success');
            }
        }
    } catch (error) {
        console.error("Polling error:", error);
    }
}

// ======================================================
// MÀN HÌNH THÀNH CÔNG
// ======================================================
function showSuccessScreen() {
    document.querySelectorAll('#booking-payment-view .booking-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');

    document.getElementById('succ_bac_si').innerText = 'BS. ' + bookingData.bac_si_ten;
    document.getElementById('succ_chuyen_khoa').innerText = bookingData.chuyen_khoa_ten;

    const d = new Date(bookingData.ngay_kham + 'T00:00:00');
    document.getElementById('succ_ngay').innerText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    document.getElementById('succ_gio').innerText = bookingData.gio_kham;
}

// ======================================================
// RESET BOOKING
// ======================================================
function resetBooking() {
    bookingData = {
        chuyen_khoa_id: null,
        chuyen_khoa_ten: '',
        bac_si_id: null,
        bac_si_ten: '',
        bac_si_avatar: '',
        ngay_kham: '',
        gio_kham: '',
        phi_kham: 0
    };

    // Reset UI
    document.getElementById('summary_trieu_chung').value = '';
    document.getElementById('booking_search_input').value = '';
    symptomImagesBase64 = [];
    renderSymptomImages();
    searchKeyword = '';

    // Hiện lại booking view
    document.getElementById('booking-payment-view').style.display = 'none';
    document.getElementById('booking-main-view').style.display = 'block';

    // Reset steps
    document.querySelectorAll('#booking-payment-view .booking-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-5').classList.add('active');

    // Re-render
    initDateRange();
    renderDoctorCards();
    updateSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ======================================================
// XỬ LÝ ẢNH TRIỆU CHỨNG
// ======================================================

function handleSymptomImages(event) {
    const files = event.target.files;
    
    if (symptomImagesBase64.length + files.length > 3) {
        Swal.fire('Cảnh báo', 'Bạn chỉ được tải lên tối đa 3 ảnh', 'warning');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            symptomImagesBase64.push(base64);
            renderSymptomImages();
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function renderSymptomImages() {
    const previewContainer = document.getElementById('symptom_images_preview');
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    symptomImagesBase64.forEach((base64, index) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '60px';
        div.style.height = '60px';
        
        const img = document.createElement('img');
        img.src = base64;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.border = '1px solid #e2e8f0';

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '-5px';
        removeBtn.style.right = '-5px';
        removeBtn.style.background = 'red';
        removeBtn.style.color = 'white';
        removeBtn.style.border = 'none';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '18px';
        removeBtn.style.height = '18px';
        removeBtn.style.lineHeight = '15px';
        removeBtn.style.fontSize = '14px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.padding = '0';
        removeBtn.onclick = () => {
            symptomImagesBase64.splice(index, 1);
            renderSymptomImages();
        };

        div.appendChild(img);
        div.appendChild(removeBtn);
        previewContainer.appendChild(div);
    });
}
