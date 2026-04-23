// Biến toàn cục để lưu ID bác sĩ và dữ liệu
let currentDoctorId = null;
let currentAppointments = [];
let currentShifts = [];
let currentQA = [];

// 1. CHUYỂN TABS CHÍNH
function switchTab(event, tabId) {
    event.preventDefault();
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// 2. CHUYỂN SUB-TABS (LỌC LỊCH KHÁM)
function filterAppointments(event, status) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    window.currentAppStatus = status; // Lưu lại trạng thái tab hiện tại
    
    renderAppointments(status); // Gọi lại hàm render với bộ lọc
}

// 3. ĐĂNG XUẤT
function confirmLogout(event) {
    if(event) event.preventDefault();
    Swal.fire({
        title: 'Đăng xuất?', text: "Thoát khỏi phiên làm việc của Bác sĩ?", icon: 'question',
        showCancelButton: true, confirmButtonColor: '#0284C7', cancelButtonColor: '#64748B',
        confirmButtonText: 'Đăng xuất', cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) { 
            Swal.fire({ title: 'Đăng xuất thành công!', text: 'Đang chuyển hướng về trang chủ...', icon: 'success', showConfirmButton: false, timer: 1500 })
            .then(() => { localStorage.clear(); window.location.href = '../index.html'; });
        }
    });
}

// 4. NGHIỆP VỤ: KHÁM BỆNH & KÊ ĐƠN
function openMedicalRecord(maLK, tenBN) {
    Swal.fire({
        title: `Khám bệnh: ${tenBN} (${maLK})`,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px;">Kê đơn thuốc / Ghi chú</label>
                    <textarea id="don_thuoc" class="swal2-textarea" placeholder="Chẩn đoán: Viêm họng cấp\n1. Paracetamol 500mg - 10 viên..." style="width: 90%; margin: 0; height: 100px;"></textarea>
                </div>
            </div>
        `,
        width: '600px', showCancelButton: true, confirmButtonText: 'Hoàn tất khám', cancelButtonText: 'Hủy', confirmButtonColor: '#10B981',
        preConfirm: () => {
            const donThuoc = document.getElementById('don_thuoc').value;
            if (!donThuoc) Swal.showValidationMessage('Vui lòng nhập chẩn đoán/đơn thuốc!');
            return { ghi_chu: donThuoc };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/appointments/${maLK}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trang_thai: 'Done', ghi_chu_cua_bac_si: result.value.ghi_chu })
                });
                if(res.ok) {
                    Swal.fire('Hoàn thành!', 'Hồ sơ bệnh án đã được lưu.', 'success');
                    fetchAppointments(); // Gọi lại hàm load dữ liệu
                } else {
                    Swal.fire('Lỗi', 'Không thể lưu hồ sơ bệnh án', 'error');
                }
            } catch(e) { console.error(e); }
        }
    });
}

// 5. NGHIỆP VỤ: DUYỆT & HỦY LỊCH
function approveAppointment(maLK) {
    Swal.fire({ title: 'Duyệt lịch?', text: `Chấp nhận lịch #${maLK}?`, icon: 'info', showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Duyệt' })
    .then(async (result) => { 
        if(result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/appointments/${maLK}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trang_thai: 'Approved' })
                });
                if(res.ok) {
                    Swal.fire('Đã duyệt!', '', 'success');
                    fetchAppointments(); // Load lại data
                } else {
                    Swal.fire('Lỗi!', 'Không thể duyệt lịch hẹn', 'error');
                }
            } catch(e) { console.error(e); }
        } 
    });
}
function cancelAppointment(maLK) {
    Swal.fire({ title: 'Hủy lịch?', input: 'text', inputPlaceholder: 'Lý do hủy...', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Hủy lịch' })
    .then(async (result) => { 
        if(result.isConfirmed && result.value) {
            try {
                const res = await fetch(`http://localhost:3000/api/appointments/${maLK}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trang_thai: 'Cancelled', ghi_chu_cua_bac_si: result.value })
                });
                if(res.ok) {
                    Swal.fire('Đã hủy!', '', 'success');
                    fetchAppointments(); // Load lại data
                } else {
                    Swal.fire('Lỗi!', 'Không thể hủy lịch hẹn', 'error');
                }
            } catch(e) { console.error(e); }
        } 
    });
}

// 6. NGHIỆP VỤ: TRẢ LỜI CÂU HỎI Q&A
function replyQA(maCH) {
    const question = currentQA.find(q => q.id === maCH);
    const currentReply = question && question.tra_loi ? question.tra_loi : '';
    const isEditing = !!currentReply;

    Swal.fire({
        title: isEditing ? 'Sửa câu trả lời' : 'Phản hồi bệnh nhân', 
        input: 'textarea', 
        inputValue: currentReply,
        inputPlaceholder: 'Nhập câu trả lời của Bác sĩ...',
        showCancelButton: true, 
        confirmButtonColor: '#0284C7', 
        confirmButtonText: isEditing ? 'Cập nhật' : 'Gửi phản hồi',
        inputValidator: (value) => { if (!value) return 'Vui lòng nhập nội dung trả lời!' }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            try {
                const res = await fetch(`http://localhost:3000/api/questions/${maCH}/reply`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tra_loi: result.value })
                });
                if (res.ok) {
                    Swal.fire('Đã gửi!', 'Câu trả lời đã được lưu trên hệ thống.', 'success');
                    fetchDoctorQA(); // Load lại giao diện Hỏi đáp
                } else {
                    Swal.fire('Lỗi', 'Không thể gửi câu trả lời', 'error');
                }
            } catch (e) { console.error(e); }
        }
    });
}

// ==========================================
// HÀM FETCH VÀ RENDER HỎI ĐÁP CỦA BÁC SĨ
// ==========================================
async function fetchDoctorQA() {
    try {
        // Lấy thông tin Bác sĩ đang đăng nhập
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const docSpecialtyId = userInfo.chuyen_khoa_id;

        const res = await fetch('http://localhost:3000/api/questions');
        const allQA = await res.json();
        
        if (allQA.length > 0 && allQA[0].chuyen_khoa_id === undefined) {
            console.error("⚠️ LỖI BACKEND: API /api/questions không trả về 'chuyen_khoa_id'. Bác sĩ sẽ không thấy câu hỏi!");
        }

        // Thuật toán: Chỉ lọc ra những câu hỏi có chuyen_khoa_id trùng với chuyên khoa của bác sĩ (Ép kiểu chuỗi)
        if (docSpecialtyId) {
            currentQA = allQA.filter(q => {
                if (q.chuyen_khoa_id === undefined || q.chuyen_khoa_id === null) return false;
                return q.chuyen_khoa_id.toString() === docSpecialtyId.toString();
            });
        } else {
            currentQA = []; // Nếu bác sĩ chưa được phân khoa thì không hiển thị câu hỏi
        }

        // Cập nhật số lượng câu hỏi mới trên thống kê
        const pendingQA = currentQA.filter(q => !(q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== ''))).length;
        const elQa = document.getElementById('stat_qa');
        if (elQa) elQa.innerText = pendingQA < 10 ? '0' + pendingQA : pendingQA;

        const container = document.getElementById('doctorQaListContainer');
        if (!container) return;
        container.innerHTML = '';

        if (currentQA.length === 0) {
            if (!docSpecialtyId) {
                container.innerHTML = '<p style="text-align: center; color: #EF4444; font-weight: bold;">Bạn chưa được phân chuyên khoa. Vui lòng liên hệ Admin.</p>';
            } else {
                container.innerHTML = '<p style="text-align: center; color: #64748B;">Chưa có câu hỏi nào thuộc chuyên khoa của bạn.</p>';
            }
            return;
        }

        currentQA.forEach(q => {
            const date = new Date(q.ngay_tao || Date.now());
            const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            const isAnswered = q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== '');
            const btnHtml = isAnswered 
                ? `<div style="background: #F0F9FF; padding: 12px; border-radius: 8px; border-left: 4px solid #10B981;">
                     <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                       <span style="color: #10B981; font-size: 14px; font-weight: 600;"><i class="fa-solid fa-check-double"></i> Bác sĩ đã trả lời:</span>
                       <button onclick="replyQA(${q.id})" style="background: none; border: none; color: #0284C7; cursor: pointer; font-size: 13px; font-weight: bold;"><i class="fa-solid fa-pen"></i> Sửa lại</button>
                     </div>
                     <p style="margin: 0; color: #334155; font-size: 14px; margin-top: 5px;">${q.tra_loi}</p>
                   </div>` 
                : `<button class="btn btn-primary" onclick="replyQA(${q.id})"><i class="fa-solid fa-reply"></i> Trả lời bệnh nhân</button>`;

            container.innerHTML += `
                <div class="qa-item">
                    <div class="qa-header">
                        <h4>${q.tieu_de || 'Câu hỏi từ bệnh nhân'} (Mã CH: #${q.id})</h4>
                        <span class="qa-date">${dateStr} | Người hỏi: ${q.nguoi_hoi || 'Ẩn danh'}</span>
                    </div>
                    <div class="qa-content">${q.noi_dung}</div>
                    <div style="margin-top: 15px;">${btnHtml}</div>
                </div>
            `;
        });
    } catch (error) { console.error('Lỗi khi lấy hỏi đáp:', error); }
}

// ==========================================
// 7. FORM ĐĂNG KÝ CA LÀM VIỆC
// ==========================================
function openShiftModal(shiftId = null) {
    if (!currentDoctorId) {
        Swal.fire('Lỗi', 'Không tìm thấy thông tin Bác sĩ. Vui lòng đăng nhập lại!', 'error');
        return;
    }

    let defaultDate = new Date().toISOString().split('T')[0];
    let defaultStart = "08:00";
    let defaultEnd = "11:30";
    let defaultMax = 20;
    let isEditing = false;

    if (shiftId) {
        const shift = currentShifts.find(s => s.id === shiftId);
        if (shift) {
            isEditing = true;
            defaultDate = new Date(shift.ngay_lam_viec).toISOString().split('T')[0];
            const timeParts = shift.khung_gio.split(' - ');
            if (timeParts.length === 2) {
                defaultStart = timeParts[0];
                defaultEnd = timeParts[1];
            }
            defaultMax = shift.so_luong_toi_da;
        }
    }

    Swal.fire({
        title: isEditing ? 'Sửa ca làm việc' : 'Đăng ký ca làm việc',
        width: '500px',
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Ngày làm việc (*)</label>
                <input type="date" id="shift_date" class="swal2-input" value="${defaultDate}" min="${new Date().toISOString().split('T')[0]}" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0 0 20px 0; cursor: pointer;">
                
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Từ giờ (*)</label>
                        <input type="time" id="shift_start" class="swal2-input" value="${defaultStart}" step="1800" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0; cursor: pointer;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Đến giờ (*)</label>
                        <input type="time" id="shift_end" class="swal2-input" value="${defaultEnd}" step="1800" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0; cursor: pointer;">
                    </div>
                </div>

                <label style="font-weight: 700; font-size: 14px; color: #475569; display: block; margin-bottom: 5px;">Số lượng Bệnh nhân tối đa nhận (*)</label>
                <input type="number" id="shift_max" class="swal2-input" value="${defaultMax}" min="1" max="50" style="width: 100%; max-width: 100%; box-sizing: border-box; margin: 0;">
            </div>
        `,
        showCancelButton: true, confirmButtonText: isEditing ? 'Lưu thay đổi' : 'Đăng ký ca', confirmButtonColor: '#0284C7', cancelButtonText: 'Hủy',
        preConfirm: () => {
            const date = document.getElementById('shift_date').value;
            const start = document.getElementById('shift_start').value;
            const end = document.getElementById('shift_end').value;
            const max = document.getElementById('shift_max').value;

            if (!date) { Swal.showValidationMessage('Vui lòng chọn ngày làm việc!'); return false; }
            if (!start || !end) { Swal.showValidationMessage('Vui lòng chọn thời gian bắt đầu và kết thúc!'); return false; }
            if (start >= end) { Swal.showValidationMessage('Thời gian kết thúc phải lớn hơn thời gian bắt đầu!'); return false; }
            if (!max || max <= 0) { Swal.showValidationMessage('Số lượng bệnh nhân phải lớn hơn 0!'); return false; }

            // Gom data đúng với CSDL
            return { 
                bac_si_id: currentDoctorId,
                ngay_lam_viec: date, 
                khung_gio: `${start} - ${end}`, 
                so_luong_toi_da: parseInt(max) 
            };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const url = isEditing ? `http://localhost:3000/api/shifts/${shiftId}` : 'http://localhost:3000/api/shifts';
                const method = isEditing ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });
                const data = await res.json();
                if(res.ok) {
                    Swal.fire('Thành công!', isEditing ? 'Đã cập nhật ca làm việc.' : 'Đã đăng ký ca làm việc thành công.', 'success');
                    fetchShifts(); // Tải lại bảng ca làm việc
                } else {
                    Swal.fire('Lỗi!', data.message || 'Thao tác không thành công.', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
}

// XÓA CA LÀM VIỆC
function deleteShift(shiftId) {
    Swal.fire({
        title: 'Bạn chắc chắn chứ?',
        text: 'Ca làm việc này sẽ bị xóa. (Không thể xóa nếu đã có bệnh nhân đặt lịch)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Vâng, xóa đi!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/shifts/${shiftId}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Ca làm việc đã bị xóa.', 'success');
                    fetchShifts();
                } else {
                    const data = await res.json();
                    Swal.fire('Lỗi!', data.message || 'Không thể xóa ca làm việc này.', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
}

// ==========================================
// HÀM FETCH VÀ RENDER DỮ LIỆU CA LÀM VIỆC
// ==========================================
async function fetchShifts() {
    if (!currentDoctorId) return;
    try {
        const res = await fetch(`http://localhost:3000/api/shifts/doctor/${currentDoctorId}`);
        currentShifts = await res.json();
        
        const tbody = document.getElementById('shiftTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!currentShifts || currentShifts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748B;">Chưa có ca làm việc nào.</td></tr>`;
            return;
        }

        currentShifts.forEach(shift => {
            const d = new Date(shift.ngay_lam_viec);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const booked = shift.so_luong_hien_tai || 0;
            const max = shift.so_luong_toi_da;
            const isFull = booked >= max;
            
            tbody.innerHTML += `
                <tr>
                    <td><b>${formattedDate}</b></td>
                    <td><span style="color: var(--primary); font-weight: 600;">${shift.khung_gio}</span></td>
                    <td>${max} Bệnh nhân / Ca</td>
                    <td><span style="color: ${isFull ? '#EF4444' : '#166534'}; font-weight: bold;">${booked}/${max} ${isFull ? '(Đã kín)' : ''}</span></td>
                    <td style="display:flex; gap:5px;">
                        <button class="action-btn btn-primary" onclick="openShiftModal(${shift.id})" title="Sửa" style="background:#0284c7; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn btn-danger" onclick="deleteShift(${shift.id})" title="Xóa" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Lỗi khi lấy ca làm việc:', error);
    }
}

// ==========================================
// HÀM FETCH VÀ RENDER LỊCH HẸN CỦA BÁC SĨ
// ==========================================
async function fetchAppointments() {
    if (!currentDoctorId) return;
    try {
        const res = await fetch(`http://localhost:3000/api/appointments/doctor/${currentDoctorId}`);
        currentAppointments = await res.json();
        
        // Đếm dữ liệu theo trạng thái
        const pendingCount = currentAppointments.filter(app => app.trang_thai.toLowerCase() === 'pending').length;
        const approvedCount = currentAppointments.filter(app => app.trang_thai.toLowerCase() === 'approved').length;
        const doneCount = currentAppointments.filter(app => app.trang_thai.toLowerCase() === 'done').length;
        
        // Đếm số ca khám trong ngày hôm nay
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = currentAppointments.filter(app => {
            if (!app.ngay_lam_viec) return false;
            return new Date(app.ngay_lam_viec).toISOString().split('T')[0] === todayStr;
        }).length;

        const filterBtns = document.querySelectorAll('.filter-btn');
        if (filterBtns.length >= 3) {
            filterBtns[1].innerText = `Chờ duyệt (${pendingCount})`;
            filterBtns[2].innerText = `Đã duyệt (${approvedCount})`;
            if (filterBtns.length > 3) filterBtns[3].innerText = `Đã khám (${doneCount})`;
        }
        
        // ==========================================
        // ĐỒNG BỘ LÊN BẢNG THỐNG KÊ (DƯỚI NAVBAR)
        // ==========================================
        const elPending = document.getElementById('stat_pending');
        if (elPending) elPending.innerText = pendingCount < 10 ? '0' + pendingCount : pendingCount;
        
        const elDone = document.getElementById('stat_done');
        if (elDone) elDone.innerText = doneCount < 10 ? '0' + doneCount : doneCount;
        
        const elToday = document.getElementById('stat_today');
        if (elToday) elToday.innerText = todayCount < 10 ? '0' + todayCount : todayCount;

        renderAppointments('all');
    } catch (error) {
        console.error('Lỗi khi lấy lịch hẹn:', error);
    }
}

function renderAppointments(filterStatus) {
    // Ghi nhớ và giữ nguyên trạng thái Tab khi người dùng gõ tìm kiếm
    if (filterStatus) window.currentAppStatus = filterStatus;
    else filterStatus = window.currentAppStatus || 'all';

    const tbody = document.getElementById('appointmentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Lấy từ khóa tìm kiếm và chuyển về chữ thường để so sánh (Kiểu LIKE)
    const searchInput = document.getElementById('searchAppointment');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredList = [...currentAppointments];
    
    // 1. Lọc theo Tab Trạng thái
    if (filterStatus !== 'all') {
        filteredList = currentAppointments.filter(app => app.trang_thai.toLowerCase() === filterStatus.toLowerCase());
    } else {
        // Thuật toán: Sắp xếp các lịch hẹn đăng ký mới nhất lên đầu tiên khi ở tab "Tất cả"
        filteredList.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));
    }

    // 2. Thuật toán lọc theo Từ khóa (Tên bệnh nhân, Mã lịch khám, SĐT)
    if (keyword) {
        filteredList = filteredList.filter(app => 
            (app.ten_benh_nhan && app.ten_benh_nhan.toLowerCase().includes(keyword)) || 
            `lk${app.id}`.includes(keyword) || 
            (app.so_dien_thoai && app.so_dien_thoai.includes(keyword))
        );
    }

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748B;">Không tìm thấy lịch hẹn phù hợp.</td></tr>`;
        return;
    }

    filteredList.forEach(app => {
        let statusHtml = '';
        let actionHtml = '';
        
        const status = app.trang_thai.toLowerCase();
        if (status === 'pending') {
            statusHtml = `<span class="badge badge-pending" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 12px; font-size: 12px;"><span class="dot" style="background:#f59e0b; display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:5px;"></span>Chờ duyệt</span>`;
            actionHtml = `
                <button class="action-btn btn-success" onclick="approveAppointment('${app.id}')" title="Duyệt" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-check"></i></button>
                <button class="action-btn btn-danger" onclick="cancelAppointment('${app.id}')" title="Hủy" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            `;
        } else if (status === 'approved') {
            statusHtml = `<span class="badge badge-approved" style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 12px;"><span class="dot" style="background:#22c55e; display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:5px;"></span>Đã duyệt</span>`;
            actionHtml = `<button class="action-btn btn-primary" onclick="openMedicalRecord('${app.id}', '${app.ten_benh_nhan}')" style="background:#0284c7; color:white; border:none; padding: 5px 15px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-stethoscope"></i> Khám bệnh</button>`;
        } else {
            statusHtml = `<span class="badge" style="background:#f3f4f6; color:#4b5563; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã khám xong</span>`;
            actionHtml = `<span style="font-size: 12px; color: #10B981;"><i class="fa-solid fa-check-double"></i> Hoàn thành</span>`;
        }

        const d = new Date(app.ngay_lam_viec);
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#LK${app.id}</strong></td>
                <td><b>${app.ten_benh_nhan}</b><br><span style="color:var(--text-sub); font-size:12px;">${app.so_dien_thoai || 'Chưa cập nhật'}</span></td>
                <td>${formattedDate}<br><span style="color:var(--primary); font-size:12px; font-weight: 600;">${app.khung_gio}</span></td>
                <td>${app.mo_ta_trieu_chung || 'Không có'}</td>
                <td>${statusHtml}</td>
                <td style="display:flex; gap:5px; align-items:center;">${actionHtml}</td>
            </tr>
        `;
    });
}

// ==========================================
// ĐỒNG BỘ DỮ LIỆU THẬT LÊN GIAO DIỆN BÁC SĨ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const userInfoString = localStorage.getItem('userInfo');
    
    if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        
        currentDoctorId = userInfo.id; // Lưu ID để dùng cho các hàm Call API

        // 1. CẬP NHẬT NAVBAR
        const docName = userInfo.ho_ten || userInfo.ten_dang_nhap || "Bác sĩ";
        const elDoctorName = document.getElementById('doctorName');
        if (elDoctorName) elDoctorName.innerText = docName;

        // XỬ LÝ AVATAR TRÁNH LỖI VỠ ẢNH
        const avatarImg = document.getElementById('nav_doctor_img');
        if (avatarImg) {
            // Tự động tạo ảnh bằng chữ cái đầu (VD: Thiệu -> T)
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=0284C7&color=fff&rounded=true&bold=true`;
            
            if (userInfo.anh_dai_dien) {
                // SỬA LỖI 431: Nếu là chuỗi Base64, gán thẳng vào src, không ghép với URL server
                if (userInfo.anh_dai_dien.startsWith('data:image')) {
                    avatarImg.src = userInfo.anh_dai_dien;
                // Nếu là link ảnh từ bên ngoài (VD: Google, Facebook...)
                } else if (userInfo.anh_dai_dien.startsWith('http')) {
                    avatarImg.src = userInfo.anh_dai_dien;
                } else {
                // Nếu chỉ là tên file (VD: 'bs_thieu.jpg'), thì mới ghép với URL server
                    avatarImg.src = `http://localhost:3000/uploads/${userInfo.anh_dai_dien}`;
                }
                // Nếu ảnh server bị lỗi, tự đổi sang ảnh chữ cái
                avatarImg.onerror = function() {
                    this.onerror = null; // Tránh lặp vô hạn
                    this.src = fallbackAvatar;
                };
            } else {
                avatarImg.src = fallbackAvatar;
            }
        }

        // 2. CẬP NHẬT TAB HỒ SƠ CHUYÊN MÔN
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setText('hs_ten', userInfo.ho_ten || "Chưa cập nhật");
        setText('hs_sdt', userInfo.so_dien_thoai || "Chưa cập nhật");
        setText('hs_email', userInfo.email || "Chưa cập nhật");
        setText('hs_chuyen_khoa', userInfo.ten_chuyen_khoa || "Chưa phân khoa");
        
        const exp = userInfo.nam_kinh_nghiem ? `${userInfo.nam_kinh_nghiem} năm` : "Chưa cập nhật";
        setText('hs_kinh_nghiem', exp);

        // Format tiền tệ VNĐ
        const fee = userInfo.phi_kham ? new Intl.NumberFormat('vi-VN').format(userInfo.phi_kham) : "Chưa cập nhật";
        setText('hs_phi_kham', fee);

        setText('hs_tieu_su', userInfo.tieu_su || "Chưa cập nhật tiểu sử.");
        
        // 3. GỌI API LẤY DỮ LIỆU
        fetchShifts();
        fetchAppointments();
        fetchDoctorQA();

    } else {
        // NẾU KHÔNG CÓ DỮ LIỆU (Chưa đăng nhập) -> Đuổi về trang login
        window.location.href = '../login.html'; 
    }
});