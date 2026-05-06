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

        // KIỂM TRA FOCUS BÁC SĨ (Tự động bôi xanh khi chuyển từ trang chủ sang)
        const pendingDocId = localStorage.getItem('pendingBookingDoctorId');
        if (pendingDocId) {
            localStorage.removeItem('pendingBookingDoctorId'); // Xóa ngay lập tức
            if(typeof switchTab === 'function') switchTab(null, 'tab-dat-lich');
            setTimeout(() => {
                const docCard = document.getElementById(`booking-doc-card-${pendingDocId}`);
                if (docCard) {
                    docCard.click();
                    setTimeout(() => docCard.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                }
            }, 300);
        }
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
            <div class="doctor-card" id="booking-doc-card-${doc.id}" style="${cardStyle} padding: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; transition: 0.2s;" onclick="selectDoctor(${doc.id}, '${doc.ho_ten}', '${doc.ten_chuyen_khoa || 'Đa khoa'}', this)">
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
// ĐIỀU HƯỚNG CÁC BƯỚC (NEXT STEP) - SỬA LẠI ĐỂ CÓ BƯỚC 5
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
        const ngaySinh = document.getElementById('bk_ngay_sinh').value;
        const gtNam = document.getElementById('bk_gt_nam').checked;
        const gtNu = document.getElementById('bk_gt_nu').checked;
        const trieuChung = document.getElementById('bk_trieu_chung').value;
        
        if (!ngaySinh) {
            Swal.fire('Lỗi', 'Vui lòng chọn ngày sinh!', 'warning');
            return;
        }
        if (!gtNam && !gtNu) {
            Swal.fire('Lỗi', 'Vui lòng chọn giới tính!', 'warning');
            return;
        }
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
        
        const nsObj = new Date(ngaySinh);
        document.getElementById('cf_ngay_sinh').innerText = `${String(nsObj.getDate()).padStart(2, '0')}/${String(nsObj.getMonth()+1).padStart(2, '0')}/${nsObj.getFullYear()}`;
        document.getElementById('cf_gioi_tinh').innerText = gtNam ? 'Nam' : 'Nữ';
        document.getElementById('cf_trieu_chung').innerText = trieuChung;
    }

    // UI chuyển Step
    document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
    
    // Cập nhật lại thanh tiến trình 5 Bước
    for(let i = 1; i <= 5; i++) {
        const nav = document.getElementById(`step-nav-${i}`);
        if(nav) {
            if(i < step) { nav.classList.add('completed'); nav.classList.remove('active'); } 
            else if (i === step) { nav.classList.add('active'); nav.classList.remove('completed'); } 
            else { nav.classList.remove('active', 'completed'); }
        }
    }
    document.querySelectorAll('.step-line').forEach((line, index) => {
        if(index < step - 1) line.classList.add('completed');
        else line.classList.remove('completed');
    });

    document.getElementById(`step-${step}`).classList.add('active');
}

// ======================================================
// XỬ LÝ CHUYỂN BƯỚC THANH TOÁN (TỪ BƯỚC 5 SANG BƯỚC 6)
// ======================================================
function processPayment() {
    // Dù là tiền mặt hay chuyển khoản, BẤM VÀO LÀ GỌI API LƯU LỊCH TRƯỚC
    submitBooking();
}

function backToStep5() {
    document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-5').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hàm loại bỏ dấu Tiếng Việt cho QR Code
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ă|ằ|ắ|ặ|ẳ|ẵ|â|ầ|ấ|ậ|ẩ|ẫ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

let pollingInterval = null;
let paymentCountdownInterval = null;
let currentPendingAppointmentId = null;

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
                await fetch(`http://localhost:3000/api/appointments/${currentPendingAppointmentId}/unpaid`, { method: 'DELETE' });
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

async function cancelUnpaidAndGoBack() {
    clearInterval(pollingInterval);
    clearInterval(paymentCountdownInterval);
    
    if (currentPendingAppointmentId) {
        try {
            await fetch(`http://localhost:3000/api/appointments/${currentPendingAppointmentId}/unpaid`, { method: 'DELETE' });
            currentPendingAppointmentId = null;
        } catch (error) {
            console.error('Lỗi hủy lịch:', error);
        }
    }
    backToStep5();
}

// ======================================================
// XÁC NHẬN VÀ LƯU DATABASE TỪ BƯỚC 5
// ======================================================
async function submitBooking() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    // Lấy phương thức thanh toán người dùng chọn
    const paymentMethodElement = document.querySelector('input[name="payment_method"]:checked');
    const paymentMethod = paymentMethodElement ? paymentMethodElement.value : 'cash';

    const payload = {
        benh_nhan_id: userInfo.id,
        bac_si_id: bookingData.bac_si_id,
        ngay_lam_viec: bookingData.ngay_kham,
        khung_gio: bookingData.gio_kham,
        mo_ta_trieu_chung: document.getElementById('bk_trieu_chung').value,
        ho_ten: document.getElementById('bk_ten').value,
        email: document.getElementById('bk_email').value,
        phuong_thuc_thanh_toan: paymentMethod 
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
            Swal.close();
            
            currentPendingAppointmentId = result.appointmentId;
            
            if (paymentMethod === 'cash') {
                // Tiền mặt -> Thành công luôn
                document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
                document.getElementById('step-success').classList.add('active');
                
                document.getElementById('succ_bac_si').innerText = 'BS. ' + bookingData.bac_si_ten;
                document.getElementById('succ_chuyen_khoa').innerText = bookingData.chuyen_khoa_ten;
                
                const d = new Date(bookingData.ngay_kham);
                document.getElementById('succ_ngay').innerText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                document.getElementById('succ_gio').innerText = bookingData.gio_kham;
            } else if (paymentMethod === 'transfer' || paymentMethod === 'momo') {
                // Chuyển khoản hoặc MoMo -> Đều mở Bước 6 hiện QR
                document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
                document.getElementById('step-6').classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });

                const patientNameNoAccent = removeVietnameseTones(payload.ho_ten).toUpperCase();
                // Cú pháp nội dung chuẩn bắt buộc phải có "TTMED [ID]" để Webhook Casso bắt được
                const transferContent = `TTMED ${result.appointmentId} BN ${patientNameNoAccent}`;
                const amount = result.phi_kham;
                
                document.getElementById('pay-amount-text').innerText = Number(amount).toLocaleString('en-US');

                let qrUrl = '';
                
                // ĐỔI GIAO DIỆN VÀ GÁN THÔNG TIN TÀI KHOẢN THEO PHƯƠNG THỨC MÀ KHÁCH CHỌN
                if (paymentMethod === 'transfer') {
                    // LOGIC CỦA ANH THỌ (DÙNG CASSO + VIETQR)
                    document.querySelector('#step-6 .step-title').innerText = 'Thanh toán chuyển khoản';
                    document.querySelector('#step-6 .step-desc').innerText = 'Vui lòng dùng ứng dụng Ngân hàng quét mã QR bên dưới. Hệ thống sẽ tự động xác nhận sau khi bạn thanh toán thành công.';
                    document.querySelector('#content-bank > div:first-child').innerText = 'Quét mã QR Ngân hàng';
                    document.querySelector('#content-bank > div:first-child').style.background = '#0284c7';
                    document.getElementById('content-bank').style.borderColor = '#cbd5e1'; // Viền mặc định
                    
                    const bankBin = "MB"; 
                    const bankAccount = "00003082058888"; 
                    const accountName = "TONG XUAN THO"; 
                    qrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;
                } else if (paymentMethod === 'momo') {
                    // LOGIC CỦA BẠN (DÙNG PAYOS CHO VÍ MOMO)
                    document.querySelector('#step-6 .step-title').innerText = 'Thanh toán qua Ví MoMo';
                    document.querySelector('#step-6 .step-desc').innerText = 'Vui lòng mở ứng dụng MoMo trên điện thoại và quét mã QR bên dưới để thanh toán. Hệ thống sẽ tự động xác nhận.';
                    document.querySelector('#content-bank > div:first-child').innerText = 'Dùng App MoMo quét mã này';
                    document.querySelector('#content-bank > div:first-child').style.background = '#A50064'; // Màu hồng MoMo
                    document.getElementById('content-bank').style.borderColor = '#A50064'; // Đổi viền nét đứt sang màu hồng MoMo
                    
                    // Tạo link ảnh QR dựa trên chuỗi mã hóa mà PayOS gửi từ Backend
                    qrUrl = `https://quickchart.io/qr?size=300&margin=2&text=${encodeURIComponent(result.payosQrCode)}`;
                }

                const qrImg = document.getElementById('dynamic-vietqr-img');
                const spinner = document.getElementById('qr-loading-spinner');
                
                qrImg.onload = () => {
                    spinner.style.display = 'none';
                    qrImg.style.display = 'block';
                };
                qrImg.src = qrUrl;

                startPaymentCountdown(30 * 60); // 30 phút (Tính bằng giây)

                // BẮT ĐẦU VÒNG LẶP KIỂM TRA TRẠNG THÁI THANH TOÁN MỖI 3 GIÂY
                pollingInterval = setInterval(() => {
                    checkPaymentStatus(result.appointmentId);
                }, 3000);
            }
        } else {
            Swal.fire('Lỗi', result.message || 'Không thể lưu lịch hẹn lúc này.', 'error');
        }
    } catch (error) {
        Swal.fire('Lỗi', 'Hệ thống đang bảo trì, vui lòng thử lại sau.', 'error');
    }
}

// HÀM CALL API CHECK TRẠNG THÁI (ĐƯỢC GỌI BỞI VÒNG LẶP)
async function checkPaymentStatus(appointmentId) {
    try {
        const res = await fetch(`http://localhost:3000/api/appointments/${appointmentId}/payment-status`);
        if (res.ok) {
            const data = await res.json();
            if (data.paid === true) {
                clearInterval(pollingInterval); // Dừng vòng lặp
                clearInterval(paymentCountdownInterval); // Dừng đếm ngược
                
                // Chuyển UI sang màn hình Thành công
                document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
                document.getElementById('step-success').classList.add('active');
                
                document.getElementById('succ_bac_si').innerText = 'BS. ' + bookingData.bac_si_ten;
                document.getElementById('succ_chuyen_khoa').innerText = bookingData.chuyen_khoa_ten;
                
                const d = new Date(bookingData.ngay_kham);
                document.getElementById('succ_ngay').innerText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
                document.getElementById('succ_gio').innerText = bookingData.gio_kham;
                
                Swal.fire('Thanh toán thành công!', 'Hệ thống đã nhận được tiền và xác nhận lịch hẹn của bạn.', 'success');
            }
        }
    } catch (error) {
        console.error("Polling error:", error);
    }
}
function resetBooking() {
        bookingData = {
        chuyen_khoa_id: null,
        chuyen_khoa_ten: '',
        bac_si_id: null,
        bac_si_ten: '',
        ngay_kham: '',
        gio_kham: ''
    };
    document.getElementById('select_chuyen_khoa').value = '';
    filterDoctorsBySpecialty();
    document.getElementById('booking_date').value = '';
    document.querySelector('.time-slots-grid').innerHTML = '';
    document.getElementById('bk_trieu_chung').value = '';
    document.getElementById('bk_ngay_sinh').value = '';
    document.getElementById('bk_gt_nam').checked = false;
    document.getElementById('bk_gt_nu').checked = false;
    document.getElementById ('step-success').classList.remove('active');
    nextStep(1);
    window.scrollTo({ 
        top: 0,
        behavior: 'smooth'
     });
}