window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');
// Biến toàn cục để lưu ID bác sĩ và dữ liệu
let currentDoctorId = null;
let currentAppointments = [];
let currentShifts = [];
let currentQA = [];

// 1. CHUYỂN TABS CHÍNH
function switchTab(event, tabId) {
    if (event) event.preventDefault();

    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    
    // Cập nhật lại trạng thái active cho đúng mục trên thanh Menu ngang
    const navLink = document.querySelector(`.nav-links a[onclick*="${tabId}"]`);
    if (navLink) navLink.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    // Thêm hiệu ứng cuộn mượt mà lên trên cùng
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. CHUYỂN SUB-TABS (LỌC LỊCH KHÁM)
function filterAppointments(event, status) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Nếu bấm trực tiếp từ thanh Tab
    if (event && event.target && (event.target.classList.contains('filter-btn') || event.target.closest('.filter-btn'))) {
        const targetBtn = event.target.classList.contains('filter-btn') ? event.target : event.target.closest('.filter-btn');
        targetBtn.classList.add('active');
    } else {
        // Nếu bấm từ 4 thẻ thống kê trên cùng (Tự động active Tab tương ứng)
        const filterBtns = document.querySelectorAll('.filter-btn');
        if (status === 'all' && filterBtns[0]) filterBtns[0].classList.add('active');
        if (status === 'pending_all' && filterBtns[1]) filterBtns[1].classList.add('active');
        if (status === 'done' && filterBtns[2]) filterBtns[2].classList.add('active');
    }
    
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
            .then(() => { 
                // Chỉ xóa phiên đăng nhập của Bác sĩ, không ảnh hưởng Bệnh nhân
                localStorage.removeItem('doctorToken'); 
                localStorage.removeItem('doctorInfo'); 
                window.location.href = '../index.html'; 
            });
        }
    });
}

// 4. NGHIỆP VỤ: KHÁM BỆNH & KÊ ĐƠN
function openMedicalRecord(maLK, tenBN) {
    let currentPrescriptions = [];
    
    // Mảng dữ liệu thuốc phổ biến (Có thể tùy chỉnh thêm)
    const thuocPhoBien = [
        "Paracetamol 500mg", "Amoxicillin 500mg", "Ibuprofen 400mg",
        "Omeprazole 20mg", "Cetirizine 10mg", "Loratadine 10mg",
        "Vitamin C 500mg", "Oresol", "Smecta", "Alpha Choay",
        "Panadol Extra", "Augmentin 1g", "Erythromycin 500mg",
        "Azithromycin 500mg", "Metformin 500mg", "Cefuroxime 500mg",
        "Men tiêu hóa Enterogermina", "Nước muối sinh lý NaCl 0.9%"
    ];
    let datalistHtml = thuocPhoBien.map(t => `<option value="${t}">`).join('');

    // Mảng dữ liệu liều dùng phổ biến để bác sĩ chọn nhanh
    const lieuDungPhoBien = [
        "1 viên/lần, ngày 2 lần sau ăn",
        "1 viên/lần, ngày 3 lần sau ăn",
        "2 viên/lần, ngày 2 lần sau ăn",
        "1 gói/lần, ngày 2 lần",
        "1 ống/lần, ngày 1 lần",
        "Sáng 1 viên, Tối 1 viên",
        "Sáng 1 viên",
        "Uống 1 viên khi đau hoặc sốt",
        "Bôi ngoài da ngày 2 lần"
    ];
    let lieuDungHtml = lieuDungPhoBien.map(l => `<option value="${l}">`).join('');

    Swal.fire({
        title: `Khám bệnh: ${tenBN} (#LK${maLK})`,
        html: `
            <div style="text-align: left; margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 20px;">
                <!-- Khu vực 1: Chẩn đoán -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px; font-size: 15px;"><i class="fa-solid fa-stethoscope" style="color: #0ea5e9;"></i> Chẩn đoán bệnh (*):</label>
                    <textarea id="chan_doan" class="swal2-textarea" placeholder="Nhập chẩn đoán lâm sàng..." style="width: 100%; margin: 0; height: 80px; box-sizing: border-box; font-size: 14px; padding: 12px; border-radius: 8px; border-color: #cbd5e1;"></textarea>
                </div>
                
                <!-- Khu vực 2: Kê đơn thuốc -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 12px; font-size: 15px;"><i class="fa-solid fa-pills" style="color: #10b981;"></i> Kê đơn thuốc:</label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                        <input list="thuoc_list" id="ten_thuoc" class="swal2-input" placeholder="Gõ tên thuốc (có gợi ý)..." style="flex: 2; margin: 0; height: 42px; font-size: 14px; border-radius: 8px; border-color: #cbd5e1;">
                        <datalist id="thuoc_list">
                            ${datalistHtml}
                        </datalist>
                        <input list="lieu_list" id="lieu_dung" class="swal2-input" placeholder="Chọn hoặc nhập liều dùng..." style="flex: 1; margin: 0; height: 42px; font-size: 14px; border-radius: 8px; border-color: #cbd5e1;">
                        <datalist id="lieu_list">
                            ${lieuDungHtml}
                        </datalist>
                        <button type="button" id="btn_add_thuoc" style="background: #0ea5e9; color: white; border: none; height: 42px; padding: 0 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; white-space: nowrap;"><i class="fa-solid fa-plus"></i> Thêm</button>
                    </div>
                    
                    <div style="max-height: 160px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f1f5f9; position: sticky; top: 0; z-index: 1;">
                                <tr>
                                    <th style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Tên thuốc</th>
                                    <th style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Liều dùng</th>
                                    <th style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 50px; color: #475569;"><i class="fa-solid fa-gear"></i></th>
                                </tr>
                            </thead>
                            <tbody id="ds_thuoc_body">
                                <tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Chưa có thuốc nào trong đơn</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Vùng chứa HTML để xuất ảnh (Ẩn khỏi viewport người dùng) -->
                <div id="prescription_capture_area" style="position: absolute; left: -9999px; top: -9999px; width: 800px; background: white; padding: 40px; color: #000; font-family: 'Times New Roman', serif;"></div>
            </div>
            
            <!-- Nút xuất ảnh Đơn thuốc -->
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" id="btn_export_img" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-file-arrow-down"></i> Lưu đơn thuốc (Ảnh JPG)</button>
            </div>
        `,
        width: '750px', 
        showCancelButton: true, 
        confirmButtonText: '<i class="fa-solid fa-check"></i> Hoàn tất khám', 
        cancelButtonText: 'Hủy', 
        confirmButtonColor: '#0284C7',
        didOpen: () => {
            const btnAdd = document.getElementById('btn_add_thuoc');
            const btnExport = document.getElementById('btn_export_img');
            const tbody = document.getElementById('ds_thuoc_body');
            const inputTen = document.getElementById('ten_thuoc');
            const inputLieu = document.getElementById('lieu_dung');
            
            // Hàm render danh sách thuốc ra bảng
            const renderThuoc = () => {
                if (currentPrescriptions.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Chưa có thuốc nào trong đơn</td></tr>';
                    return;
                }
                tbody.innerHTML = currentPrescriptions.map((t, idx) => `
                    <tr style="transition: 0.2s; cursor: default;">
                        <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${t.ten}</td>
                        <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; color: #334155;">${t.lieu}</td>
                        <td style="padding: 10px 15px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <button type="button" style="background: #fee2e2; border: none; color: #ef4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; transition: 0.2s;" onclick="window.removeThuoc(${idx})" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `).join('');
            };

            // Xóa thuốc khỏi đơn
            window.removeThuoc = (index) => {
                currentPrescriptions.splice(index, 1);
                renderThuoc();
            };

            // Thêm thuốc mới (Cộng dồn nếu trùng)
            btnAdd.addEventListener('click', () => {
                const ten = inputTen.value.trim();
                const lieu = inputLieu.value.trim();
                if (!ten || !lieu) {
                    Swal.showValidationMessage('Vui lòng nhập đủ Tên thuốc và Liều dùng!');
                    setTimeout(() => Swal.resetValidationMessage(), 2000);
                    return;
                }
                
                // KIỂM TRA TRÙNG LẶP: Tự động nối thêm liều dùng nếu thuốc đã tồn tại
                const existingIndex = currentPrescriptions.findIndex(t => t.ten.toLowerCase() === ten.toLowerCase());
                if (existingIndex !== -1) {
                    currentPrescriptions[existingIndex].lieu += ` + ${lieu}`;
                } else {
                    currentPrescriptions.push({ ten, lieu });
                }
                
                inputTen.value = '';
                inputLieu.value = '';
                inputTen.focus();
                renderThuoc();
            });

            // XUẤT ẢNH JPG DÙNG HTML2CANVAS
            btnExport.addEventListener('click', () => {
                const chanDoan = document.getElementById('chan_doan').value.trim();
                if (!chanDoan && currentPrescriptions.length === 0) {
                    Swal.showValidationMessage('Vui lòng nhập chẩn đoán hoặc kê đơn trước khi xuất!');
                    setTimeout(() => Swal.resetValidationMessage(), 2500);
                    return;
                }

                // Tải linh động thư viện HTML2Canvas nếu chưa có
                if (typeof html2canvas === 'undefined') {
                    Swal.showLoading();
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = () => {
                        Swal.hideLoading();
                        exportPrescriptionImage(tenBN, maLK, chanDoan, currentPrescriptions);
                    };
                    document.head.appendChild(script);
                } else {
                    exportPrescriptionImage(tenBN, maLK, chanDoan, currentPrescriptions);
                }
            });
        },
        preConfirm: () => {
            const chanDoan = document.getElementById('chan_doan').value.trim();
            if (!chanDoan) {
                Swal.showValidationMessage('Vui lòng nhập Chẩn đoán bệnh!');
                return false;
            }
            
            // Nối chẩn đoán và thuốc thành 1 chuỗi để lưu vào Database
            let ghiChu = `Chẩn đoán: ${chanDoan}`;
            if (currentPrescriptions.length > 0) {
                ghiChu += `\n\nĐơn thuốc:\n`;
                currentPrescriptions.forEach((t, i) => {
                    ghiChu += `${i + 1}. ${t.ten} - HDSD: ${t.lieu}\n`;
                });
            }
            
            return { ghi_chu: ghiChu };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/status`, {
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

// HÀM XUẤT ẢNH ĐƠN THUỐC
function exportPrescriptionImage(tenBenhNhan, maLK, chanDoan, danhSachThuoc) {
    const userInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
    const tenBacSi = userInfo.ho_ten || userInfo.ten_dang_nhap || 'Bác sĩ';
    
    let now = new Date();
    let ngayIn = `Ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth()+1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

    let htmlThuoc = '';
    if (danhSachThuoc.length > 0) {
        danhSachThuoc.forEach((t, i) => {
            htmlThuoc += `
                <div style="margin-bottom: 15px;">
                    <strong style="font-size: 18px; color: #000;">${i + 1}. ${t.ten}</strong><br>
                    <span style="font-size: 16px; margin-left: 20px; font-style: italic; color: #333;">Cách dùng: ${t.lieu}</span>
                </div>
            `;
        });
    } else {
        htmlThuoc = '<p style="font-style: italic; font-size: 16px; color: #555;">(Bác sĩ không kê thuốc)</p>';
    }

    // Đổ dữ liệu vào vùng ẩn để chụp ảnh
    const captureArea = document.getElementById('prescription_capture_area');
    captureArea.innerHTML = `
        <div style="border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="margin: 0 0 5px 0; color: #0284c7; font-size: 32px; text-transform: uppercase; font-family: sans-serif; font-weight: 800;">TT MEDICAL</h2>
                <p style="margin: 0; font-size: 16px; color: #555; font-family: sans-serif;">Phòng Khám Đa Khoa Chất Lượng Cao</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #555; font-family: sans-serif;">Hotline: 1900 6868</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000;">Mã phiếu: LK${maLK}</p>
            </div>
        </div>
        <div style="text-align: center; margin: 35px 0;">
            <h1 style="margin: 0; font-size: 36px; text-transform: uppercase; color: #000; letter-spacing: 2px;">ĐƠN THUỐC</h1>
        </div>
        <div style="margin-bottom: 30px; font-size: 18px; line-height: 1.8; color: #000;">
            <p style="margin: 5px 0;"><strong>Họ và tên bệnh nhân:</strong> <span style="text-transform: uppercase;">${tenBenhNhan}</span></p>
            <p style="margin: 5px 0;"><strong>Chẩn đoán lâm sàng:</strong> ${chanDoan || '(Chưa chẩn đoán)'}</p>
        </div>
        <div style="margin-top: 30px; min-height: 380px;">
            <h3 style="margin-bottom: 20px; font-size: 20px; border-bottom: 2px dotted #000; display: inline-block; color: #000; padding-bottom: 5px;">Chỉ định dùng thuốc:</h3>
            ${htmlThuoc}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 50px; text-align: center;">
            <div>
                <p style="margin: 5px 0; font-size: 16px; font-style: italic;">Hà Nội, ${ngayIn}</p>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">Bác sĩ điều trị</p>
                <div style="height: 120px;"></div>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">BS. ${tenBacSi}</p>
            </div>
        </div>
    `;

    captureArea.style.left = '0';
    captureArea.style.top = '0';
    captureArea.style.zIndex = '-1';

    html2canvas(captureArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true }).then(canvas => {
        captureArea.style.left = '-9999px'; captureArea.style.top = '-9999px';
        const link = document.createElement('a');
        link.download = `Don_Thuoc_LK${maLK}_${tenBenhNhan.replace(/\s+/g, '_')}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }).catch(err => { console.error('Lỗi khi tạo ảnh:', err); });
}

// 5. NGHIỆP VỤ: DUYỆT & HỦY LỊCH
function approveAppointment(maLK) {
    Swal.fire({ title: 'Duyệt lịch?', text: `Chấp nhận lịch #${maLK}?`, icon: 'info', showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Duyệt' })
    .then(async (result) => { 
        if(result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/status`, {
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
                const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/status`, {
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

// SỬA GHI CHÚ / ĐƠN THUỐC CỦA LỊCH ĐÃ KHÁM
function editMedicalRecord(maLK) {
    const app = currentAppointments.find(a => a.id == maLK);
    if (!app) return;

    Swal.fire({
        title: `Sửa hồ sơ: ${app.ten_benh_nhan} (#${maLK})`,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 14px;">Cập nhật Kê đơn / Ghi chú</label>
                    <textarea id="edit_don_thuoc" class="swal2-textarea" style="width: 90%; margin: 0; height: 120px;">${app.ghi_chu_cua_bac_si || ''}</textarea>
                </div>
            </div>
        `,
        width: '600px', showCancelButton: true, confirmButtonText: 'Lưu thay đổi', cancelButtonText: 'Hủy', confirmButtonColor: '#f59e0b',
        preConfirm: () => {
            const donThuoc = document.getElementById('edit_don_thuoc').value;
            return { ghi_chu: donThuoc };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/note`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ghi_chu_cua_bac_si: result.value.ghi_chu })
                });
                if(res.ok) { Swal.fire('Thành công!', 'Ghi chú đã được cập nhật.', 'success'); fetchAppointments(); } 
                else { Swal.fire('Lỗi', 'Không thể cập nhật ghi chú', 'error'); }
            } catch(e) { console.error(e); Swal.fire('Lỗi', 'Lỗi kết nối', 'error'); }
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
                const userInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
                const res = await fetch(`${window.API_BASE}/api/questions/${maCH}/reply`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        tra_loi: result.value,
                        nguoi_tra_loi_id: userInfo.id
                    })
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
let currentQAPage = 1;
const qaPerPage = 5;

async function fetchDoctorQA() {
    try {
        // Lấy thông tin Bác sĩ đang đăng nhập
        const userInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
        const docSpecialtyId = userInfo.chuyen_khoa_id;

        // Thêm timestamp để xóa Cache trình duyệt
        const res = await fetch(`${window.API_BASE}/api/questions?t=${new Date().getTime()}`);
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
        if (elQa) {
            elQa.innerText = pendingQA < 10 ? '0' + pendingQA : pendingQA;
            const cardQa = elQa.closest('.stat-card');
            if (cardQa) {
                cardQa.onclick = (e) => {
                    switchTab(e, 'tab-hoi-dap');
                };
            }
        }

        renderDoctorQA(docSpecialtyId);
    } catch (error) { console.error('Lỗi khi lấy hỏi đáp:', error); }
}

function renderDoctorQA(docSpecialtyId) {
    const container = document.getElementById('doctorQaListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (currentQA.length === 0) {
        if (!docSpecialtyId) {
            container.innerHTML = '<p style="text-align: center; color: #EF4444; font-weight: bold;">Bạn chưa được phân chuyên khoa. Vui lòng liên hệ Admin.</p>';
        } else {
            container.innerHTML = '<p style="text-align: center; color: #64748B;">Chưa có câu hỏi nào thuộc chuyên khoa của bạn.</p>';
        }
        let paginationContainer = document.getElementById('doctor_qa_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(currentQA.length / qaPerPage);
    if (currentQAPage > totalPages) currentQAPage = totalPages;
    if (currentQAPage < 1) currentQAPage = 1;

    const startIndex = (currentQAPage - 1) * qaPerPage;
    const endIndex = startIndex + qaPerPage;
    const paginatedQA = currentQA.slice(startIndex, endIndex);

    let qaHTML = '';
    paginatedQA.forEach(q => {
            const date = new Date(q.ngay_tao || Date.now());
            const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            // Xử lý tên người hỏi, Avatar và Tiêu đề ẩn danh
            let isAnDanh = false;
            let displayTieuDe = q.tieu_de || 'Câu hỏi từ bệnh nhân';
            
            if (displayTieuDe.startsWith('[Ẩn danh]')) {
                isAnDanh = true;
                displayTieuDe = displayTieuDe.replace('[Ẩn danh] ', '').replace('[Ẩn danh]', '');
            } else if (!q.nguoi_hoi || q.nguoi_hoi.trim() === '') {
                isAnDanh = true;
            }
            const nguoiHoi = isAnDanh ? 'Ẩn danh' : q.nguoi_hoi;

            const isAnswered = q.trang_thai == 1 || (q.tra_loi && q.tra_loi.trim() !== '');
            const nguoiDaTraLoi = q.ten_nguoi_tra_loi ? (q.vai_tro_tra_loi === 'Admin' || q.vai_tro_tra_loi === 'Quản trị viên' ? 'Admin' : `BS. ${q.ten_nguoi_tra_loi}`) : 'Bác sĩ';
            const btnHtml = isAnswered 
                ? `<div style="background: #F0F9FF; padding: 12px; border-radius: 8px; border-left: 4px solid #10B981;">
                     <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                       <span style="color: #10B981; font-size: 14px; font-weight: 600;"><i class="fa-solid fa-check-double"></i> ${nguoiDaTraLoi} đã trả lời:</span>
                       <button onclick="replyQA(${q.id})" style="background: none; border: none; color: #0284C7; cursor: pointer; font-size: 13px; font-weight: bold;"><i class="fa-solid fa-pen"></i> Sửa lại</button>
                     </div>
                     <p style="margin: 0; color: #334155; font-size: 14px; margin-top: 5px; word-break: break-word; white-space: pre-wrap;">${q.tra_loi}</p>
                   </div>` 
                : `<button class="btn btn-primary" onclick="replyQA(${q.id})"><i class="fa-solid fa-reply"></i> Trả lời bệnh nhân</button>`;

            qaHTML += `
                <div class="qa-item" style="word-break: break-word;">
                    <div class="qa-header">
                        <h4 style="word-break: break-word; line-height: 1.5; margin-bottom: 5px;">${displayTieuDe} (Mã CH: #${q.id})</h4>
                        <span class="qa-date">${dateStr} | Người hỏi: ${nguoiHoi}</span>
                    </div>
                    <div class="qa-content" style="word-break: break-word; white-space: pre-wrap; line-height: 1.6;">${q.noi_dung}</div>
                    <div style="margin-top: 15px;">${btnHtml}</div>
                </div>
            `;
        });
        container.innerHTML = qaHTML;
    
    renderDoctorQAPagination(totalPages);
}

function renderDoctorQAPagination(totalPages) {
    let paginationContainer = document.getElementById('doctor_qa_pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'doctor_qa_pagination';
        paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; margin-bottom: 20px; width: 100%;';
        
        const qaContainer = document.getElementById('doctorQaListContainer');
        qaContainer.parentNode.insertBefore(paginationContainer, qaContainer.nextSibling);
    }
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentQAPage > 1) {
        html += `<button style="background: white; border: 1px solid #e2e8f0; color: #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" onclick="changeDoctorQAPage(${currentQAPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentQAPage) {
            html += `<button style="background: #0284c7; border: 1px solid #0284c7; color: white; padding: 6px 12px; border-radius: 6px; cursor: default; font-weight: bold;">${i}</button>`;
        } else {
            html += `<button style="background: white; border: 1px solid #e2e8f0; color: #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" onclick="changeDoctorQAPage(${i})">${i}</button>`;
        }
    }

    if (currentQAPage < totalPages) {
        html += `<button style="background: white; border: 1px solid #e2e8f0; color: #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" onclick="changeDoctorQAPage(${currentQAPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeDoctorQAPage(page) {
    currentQAPage = page;
    const userInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
    renderDoctorQA(userInfo.chuyen_khoa_id);
    
    const container = document.getElementById('doctorQaListContainer');
    if (container) {
        const y = container.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
}

// ==========================================
// 7. FORM ĐĂNG KÝ CA LÀM VIỆC
// ==========================================
function openShiftModal(shiftId = null) {
    if (!currentDoctorId) {
        Swal.fire('Lỗi', 'Không tìm thấy thông tin Bác sĩ. Vui lòng đăng nhập lại!', 'error');
        return;
    }

    // Ép kiểu về đúng múi giờ Local (Việt Nam) để tránh lỗi lúc 12h đêm
    const nowInit = new Date();
    const offsetInit = nowInit.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(nowInit.getTime() - offsetInit).toISOString().split('T')[0];

    let defaultDate = localTodayStr;
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
        customClass: {
            popup: 'saas-modal',
            container: 'saas-backdrop',
            confirmButton: 'saas-btn-primary',
            cancelButton: 'saas-btn-outline'
        },
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <label class="saas-label"><i class="fa-regular fa-calendar" style="color: #0ea5e9; margin-right: 5px;"></i> Ngày làm việc (*)</label>
                <input type="date" id="shift_date" class="saas-input" value="${defaultDate}" min="${localTodayStr}" style="cursor: pointer;">
                
                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <label class="saas-label"><i class="fa-regular fa-clock" style="color: #10b981; margin-right: 5px;"></i> Từ giờ (*)</label>
                        <input type="time" id="shift_start" class="saas-input" value="${defaultStart}" step="1800" style="cursor: pointer;">
                    </div>
                    <div style="flex: 1;">
                        <label class="saas-label"><i class="fa-solid fa-clock-rotate-left" style="color: #f59e0b; margin-right: 5px;"></i> Đến giờ (*)</label>
                        <input type="time" id="shift_end" class="saas-input" value="${defaultEnd}" step="1800" style="cursor: pointer;">
                    </div>
                </div>

                <label class="saas-label" style="margin-top: 5px;"><i class="fa-solid fa-users" style="color: #8b5cf6; margin-right: 5px;"></i> Số lượng Bệnh nhân tối đa (*)</label>
                <input type="number" id="shift_max" class="saas-input" value="${defaultMax}" min="1" max="50">
            </div>
        `,
        showCancelButton: true, confirmButtonText: isEditing ? '<i class="fa-solid fa-check"></i> Lưu thay đổi' : '<i class="fa-solid fa-plus"></i> Đăng ký ca', confirmButtonColor: '#0ea5e9', cancelButtonText: 'Hủy',
        preConfirm: () => {
            const date = document.getElementById('shift_date').value;
            const start = document.getElementById('shift_start').value;
            const end = document.getElementById('shift_end').value;
            const max = document.getElementById('shift_max').value;

            if (!date) { Swal.showValidationMessage('Vui lòng chọn ngày làm việc!'); return false; }
            if (!start || !end) { Swal.showValidationMessage('Vui lòng chọn thời gian bắt đầu và kết thúc!'); return false; }
            if (start >= end) { Swal.showValidationMessage('Thời gian kết thúc phải lớn hơn thời gian bắt đầu!'); return false; }
            if (!max || max <= 0) { Swal.showValidationMessage('Số lượng bệnh nhân phải lớn hơn 0!'); return false; }

            // BỔ SUNG: Chặn đăng ký ca làm việc ở quá khứ hoặc khung giờ đã qua trong ngày hôm nay
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const todayStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
            const currentTimeStr = now.toTimeString().substring(0, 5); // Lấy chuẩn định dạng "HH:MM"

            if (date < todayStr) {
                Swal.showValidationMessage('Ngày làm việc đã qua (trong quá khứ). Vui lòng chọn từ hôm nay trở đi!');
                return false;
            }

            if (date === todayStr && start <= currentTimeStr) {
                Swal.showValidationMessage('Thời gian bắt đầu đã qua so với hiện tại. Vui lòng chọn giờ hợp lệ!');
                return false;
            }

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
                const url = isEditing ? `${window.API_BASE}/api/doctors/shifts/${shiftId}` : window.API_BASE + '/api/doctors/shifts';
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

// DỪNG CA LÀM VIỆC
function stopShift(shiftId) {
    Swal.fire({
        title: 'Dừng ca làm việc?',
        text: 'Bệnh nhân sẽ không thể đặt thêm lịch vào ca này nữa!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Vâng, dừng ca!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/doctors/shifts/${shiftId}/stop`, { method: 'PUT' });
                if (res.ok) {
                    Swal.fire('Đã dừng!', 'Ca làm việc đã ngừng nhận bệnh nhân.', 'success');
                    fetchShifts();
                } else Swal.fire('Lỗi!', 'Không thể dừng ca làm việc này.', 'error');
            } catch (error) { Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error'); }
        }
    });
}

// MỞ LẠI CA LÀM VIỆC
function resumeShift(shiftId) {
    Swal.fire({
        title: 'Mở lại ca làm việc?',
        text: 'Bệnh nhân sẽ có thể tiếp tục đặt lịch vào ca này!',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Vâng, mở lại!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${window.API_BASE}/api/doctors/shifts/${shiftId}/resume`, { method: 'PUT' });
                if (res.ok) {
                    Swal.fire('Thành công!', 'Ca làm việc đã được mở lại và nhận bệnh nhân.', 'success');
                    fetchShifts();
                } else Swal.fire('Lỗi!', 'Không thể mở lại ca làm việc này.', 'error');
            } catch (error) { Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error'); }
        }
    });
}

// ==========================================
// HÀM FETCH VÀ RENDER DỮ LIỆU CA LÀM VIỆC
// ==========================================
async function fetchShifts() {
    if (!currentDoctorId) return;
    try {
        const res = await fetch(`${window.API_BASE}/api/doctors/shifts/${currentDoctorId}?t=${new Date().getTime()}`);
        currentShifts = await res.json();
        
        const tbody = document.getElementById('shiftTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!currentShifts || currentShifts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748B;">Chưa có ca làm việc nào.</td></tr>`;
            return;
        }

        let shiftHTML = '';
        
        // Lấy giờ hiện tại để so sánh
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"

        currentShifts.forEach(shift => {
            const shiftDateStr = shift.ngay_lam_viec.split('T')[0];
            const d = new Date(shiftDateStr);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const booked = shift.so_luong_hien_tai || 0;
            const max = shift.so_luong_toi_da;
            const isFull = booked >= max;
            const isStopped = shift.trang_thai === 'Stopped';

            // Tách khung giờ để lấy thời gian kết thúc
            const timeParts = shift.khung_gio.split(' - ');
            const endTime = timeParts.length === 2 ? timeParts[1] : '23:59';

            // Logic kiểm tra Hết giờ
            let isExpired = false;
            if (shiftDateStr < localDateStr) isExpired = true;
            else if (shiftDateStr === localDateStr && currentTimeStr > endTime) isExpired = true;

            // Giao diện trạng thái
            let statusText = '';
            if (isExpired) statusText = '<span style="color: #64748b; font-weight: bold;"><i class="fa-solid fa-clock-rotate-left"></i> Hết giờ</span>';
            else if (isStopped) statusText = '<span style="color: #ef4444; font-weight: bold;"><i class="fa-solid fa-ban"></i> Đã dừng</span>';
            else if (isFull) statusText = '<span style="color: #f59e0b; font-weight: bold;"><i class="fa-solid fa-users-slash"></i> Đã kín</span>';
            else statusText = '<span style="color: #166534; font-weight: bold;"><i class="fa-regular fa-circle-check"></i> Đang nhận</span>';
            
            let actionBtns = '';
            if (!isExpired) {
                if (!isStopped) {
                    actionBtns = `
                        <button class="action-btn btn-warning" onclick="stopShift(${shift.id})" title="Dừng nhận bệnh nhân" style="background:#f59e0b; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-stop"></i></button>
                        <button class="action-btn btn-primary" onclick="openShiftModal(${shift.id})" title="Sửa" style="background:#0284c7; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                    `;
                } else {
                    actionBtns = `
                        <button class="action-btn btn-success" onclick="resumeShift(${shift.id})" title="Mở lại ca làm việc" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-play"></i></button>
                    `;
                }
            } else {
                actionBtns = `<span style="color: #94a3b8; font-size: 12px; font-weight: 500;">Lịch sử</span>`;
            }

            shiftHTML += `
                <tr style="${isExpired || isStopped ? 'opacity: 0.7; background: #f8fafc;' : ''}">
                    <td><b>${formattedDate}</b></td>
                    <td><span style="color: var(--primary); font-weight: 600;">${shift.khung_gio}</span></td>
                    <td>${max} Bệnh nhân</td>
                    <td>${statusText} <br><span style="font-size:12px; color:#64748b;">(${booked}/${max})</span></td>
                    <td style="display:flex; gap:5px;">${actionBtns}</td>
                </tr>
            `;
        });
        tbody.innerHTML = shiftHTML;
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
        const res = await fetch(`${window.API_BASE}/api/appointments/doctor/${currentDoctorId}?t=${new Date().getTime()}`);
        currentAppointments = await res.json();
        
        // Đếm dữ liệu theo trạng thái
        const pendingCount = currentAppointments.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'pending').length;
        const approvedCount = currentAppointments.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'approved').length;
        const doneCount = currentAppointments.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'done').length;
        
        // Gộp chung 2 loại chờ khám (Tại quầy + Đã TT Online) vào 1 biến
        const totalPending = pendingCount + approvedCount;
        
        // Đếm số ca khám trong ngày hôm nay
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
        const displayDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const todayCount = currentAppointments.filter(app => {
            if (!app.ngay_lam_viec) return false;
            return app.ngay_lam_viec.split('T')[0] === localDateStr;
        }).length;

        // ĐỒNG BỘ THANH LỌC LỊCH KHÁM (CHỈ GIỮ LẠI 3 NÚT)
        const filterBtns = document.querySelectorAll('.filter-btn');
        if (filterBtns.length >= 3) {
            filterBtns[0].innerHTML = `Tất cả (${currentAppointments.length})`;
            filterBtns[1].innerHTML = `Chờ khám (${totalPending})`;
            filterBtns[2].innerHTML = `Đã khám (${doneCount})`;
            if (filterBtns.length > 3) filterBtns[3].style.display = 'none'; // Ẩn tab thứ 4 (nếu HTML dư)
            
            // Gắn sự kiện để truyền đúng biến trạng thái lọc
            filterBtns[0].onclick = (e) => filterAppointments(e, 'all');
            filterBtns[1].onclick = (e) => filterAppointments(e, 'pending_all');
            filterBtns[2].onclick = (e) => filterAppointments(e, 'done');
        }
        
        // ==========================================
        // ĐỒNG BỘ 4 Ô THỐNG KÊ (CHO PHÉP BẤM ĐỂ LỌC)
        // ==========================================
        const updateStatCard = (id, count, filterVal, titleToReplace, newTitle) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = count < 10 ? '0' + count : count;
                const card = el.closest('.stat-card');
                if (card) {
                    // Gắn sự kiện nhảy sang Tab lịch khám và cuộn xuống
                    card.onclick = (e) => {
                        switchTab(e, 'tab-lich-kham');
                        filterAppointments(null, filterVal);
                    };
                    // Đổi tên nhãn tự động
                    if (titleToReplace && newTitle) {
                        const titleEl = card.querySelector('h3, p');
                        if (titleEl && titleEl.innerText.toLowerCase().includes(titleToReplace.toLowerCase())) titleEl.innerText = newTitle;
                    }
                }
            }
        };

        updateStatCard('stat_pending', totalPending, 'pending_all', 'duyệt', 'Chờ khám');
        updateStatCard('stat_done', doneCount, 'done');
        updateStatCard('stat_today', todayCount, 'today');
        
        // Bổ sung ngày thực tế vào thẻ Khám hôm nay tự động
        const statTodayEl = document.getElementById('stat_today');
        if (statTodayEl) {
            const cardToday = statTodayEl.closest('.stat-card');
            if (cardToday) {
                const labels = cardToday.querySelectorAll('h3, p');
                labels.forEach(label => {
                    if (label.innerText.toLowerCase().includes('hôm nay')) label.innerText = `Khám hôm nay - ${displayDateStr}`;
                });
            }
        }

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
    if (filterStatus === 'pending_all') {
        filteredList = currentAppointments.filter(app => {
            const st = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
            return st === 'pending' || st === 'approved';
        });
    } else if (filterStatus === 'today') {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
        
        filteredList = currentAppointments.filter(app => {
            if (!app.ngay_lam_viec) return false;
            return app.ngay_lam_viec.split('T')[0] === localDateStr;
        });
    } else if (filterStatus !== 'all') {
        filteredList = currentAppointments.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === filterStatus.toLowerCase());
    }

    // THUẬT TOÁN SẮP XẾP ƯU TIÊN (CÔNG BẰNG & CHUẨN LUỒNG Y TẾ)
    const statusPriority = { 'pending': 1, 'approved': 1, 'done': 2, 'cancelled': 3 };

    filteredList.sort((a, b) => {
        const statusA = a.trang_thai ? a.trang_thai.trim().toLowerCase() : '';
        const statusB = b.trang_thai ? b.trang_thai.trim().toLowerCase() : '';
        const pA = statusPriority[statusA] || 4;
        const pB = statusPriority[statusB] || 4;

        // 1. Trạng thái: Chờ khám (1) -> Đã khám (2) -> Đã hủy (3)
        if (pA !== pB) return pA - pB;

        // 2. Ngày khám: Sớm nhất lên trước
        const dateA = new Date(a.ngay_lam_viec || 0).getTime();
        const dateB = new Date(b.ngay_lam_viec || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;

        // 3. Giờ khám: Sớm nhất lên trước (Đảm bảo người đến sớm khám sớm)
        const timeA = a.gio_kham || a.khung_gio || "23:59";
        const timeB = b.gio_kham || b.khung_gio || "23:59";
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;

        return 0;
    });

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

    let trHTML = '';
    filteredList.forEach(app => {
        let statusHtml = '';
        let actionHtml = '';
        
        const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
        if (status === 'pending') {
            statusHtml = `<span class="badge badge-pending" style="background:#fef3c7; color:#d97706; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;"><span class="dot" style="background:#f59e0b; display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px;"></span>Chờ khám</span>`;
            actionHtml = `
                <button class="action-btn btn-primary" onclick="openMedicalRecord('${app.id}', '${app.ten_benh_nhan}')"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>
            `;
        } else if (status === 'approved') {
            statusHtml = `<span class="badge badge-approved" style="background:#dcfce7; color:#166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;"><i class="fa-solid fa-circle-check" style="font-size: 14px; margin-right: 2px;"></i> Chờ khám</span>`;
            actionHtml = `<button class="action-btn btn-primary" onclick="openMedicalRecord('${app.id}', '${app.ten_benh_nhan}')"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>`;
        } else if (status === 'cancelled') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã hủy</span>`;
            actionHtml = `<span style="font-size: 12px; color: #ef4444;"><i class="fa-solid fa-xmark"></i> Lịch đã bị hủy</span>`;
        } else if (status === 'done') {
            statusHtml = `<span class="badge" style="background:#f3f4f6; color:#4b5563; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã khám xong</span>`;
            actionHtml = `
                <button class="action-btn" onclick="editMedicalRecord('${app.id}')" title="Sửa ghi chú/đơn thuốc" style="background:#f59e0b; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                <span style="font-size: 12px; color: #10B981; margin-left: 5px; font-weight: 600;"><i class="fa-solid fa-check-double"></i> Xong</span>
            `;
        } else {
            // NẾU CSDL BỊ LỖI CHỮ HOẶC KÝ TỰ ẨN, BÁC SĨ SẼ NHÌN THẤY NGAY LẬP TỨC
            statusHtml = `<span class="badge" style="background:#e2e8f0; color:#475569; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Lỗi CSDL</span>`;
            actionHtml = `<span style="font-size: 12px; color: #ef4444;">Trạng thái lạ: ${app.trang_thai}</span>`;
        }

        const d = new Date(app.ngay_lam_viec);
        const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        trHTML += `
            <tr>
                <td><strong>#LK${app.id}</strong></td>
                <td><b>${app.ten_benh_nhan}</b><br><span style="color:var(--text-sub); font-size:12px;">${app.so_dien_thoai || 'Chưa cập nhật'}</span></td>
                <td>${formattedDate}<br><span style="color:var(--primary); font-size:12px; font-weight: 600;">${app.gio_kham || app.khung_gio}</span></td>
                <td>${app.mo_ta_trieu_chung || 'Không có'}</td>
                <td>${statusHtml}</td>
                <td style="display:flex; gap:5px; align-items:center;">${actionHtml}</td>
            </tr>
        `;
    });
    tbody.innerHTML = trHTML;
}

// ==========================================
// ĐỒNG BỘ DỮ LIỆU THẬT LÊN GIAO DIỆN BÁC SĨ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const userInfoString = localStorage.getItem('doctorInfo');
    
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
                    avatarImg.src = `${window.API_BASE}/uploads/${userInfo.anh_dai_dien}`;
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

        // TỰ ĐỘNG CẬP NHẬT GIAO DIỆN SAU MỖI 15 GIÂY (Chống tình trạng không cập nhật lịch)
        setInterval(() => {
            if (currentDoctorId) {
                fetchShifts();
                fetchAppointments();
            }
        }, 15000);

    } else {
        // NẾU KHÔNG CÓ DỮ LIỆU (Chưa đăng nhập) -> Đuổi về trang login
        window.location.href = '../login.html'; 
    }
});

/* =========================================================================================
   KHỞI TẠO MENU MOBILE CHUẨN (GIỮ NGUYÊN 100% GIAO DIỆN MÁY TÍNH)
========================================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const navbarContainer = document.querySelector('.navbar .container');
    const navLinks = document.querySelector('.nav-links');
    const userMenu = document.querySelector('.user-dropdown-btn');
    
    if (navbarContainer && navLinks) {
        let mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        // 1. TẠO NÚT 3 GẠCH (Chỉ hiện trên điện thoại qua CSS)
        if (!mobileMenuBtn) {
            mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            navbarContainer.appendChild(mobileMenuBtn);
        }
        
        // 2. TẠO MENU CLONE RIÊNG CHO ĐIỆN THOẠI (Không đụng chạm code Máy tính)
        let mobileDrawer = document.querySelector('.mobile-drawer');
        if (!mobileDrawer) {
            mobileDrawer = document.createElement('div');
            mobileDrawer.className = 'mobile-drawer';
            
            const btnClose = document.createElement('button');
            btnClose.className = 'close-menu-btn';
            btnClose.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            mobileDrawer.appendChild(btnClose);
            
            // Nhân bản (Clone) Menu và Avatar để nhét vào Drawer
            const clonedNav = navLinks.cloneNode(true);
            clonedNav.className = 'mobile-nav-links';
            mobileDrawer.appendChild(clonedNav);
            
            if (userMenu) {
                const clonedUser = userMenu.cloneNode(true);
                clonedUser.className = 'mobile-user-btn';
                clonedUser.removeAttribute('id'); // Tránh trùng lặp ID
                // Gắn lại sự kiện Đăng xuất cho Avatar trên điện thoại
                clonedUser.addEventListener('click', confirmLogout);
                mobileDrawer.appendChild(clonedUser);
            }
            
            document.body.appendChild(mobileDrawer);
        }
        
        // 3. GẮN SỰ KIỆN BẤM MỞ / ĐÓNG MENU TRÊN ĐIỆN THOẠI
        const closeBtnElem = document.querySelector('.mobile-drawer .close-menu-btn');
        mobileMenuBtn.addEventListener('click', () => { document.querySelector('.mobile-drawer').classList.add('active'); });
        if (closeBtnElem) closeBtnElem.addEventListener('click', () => { document.querySelector('.mobile-drawer').classList.remove('active'); });
        
        // 4. TỰ ĐỘNG ĐÓNG MENU VÀ CHUYỂN TAB KHI BẤM CHỌN
        document.querySelectorAll('.mobile-nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelector('.mobile-drawer').classList.remove('active');
                const onclickAttr = link.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes("switchTab")) {
                    const match = onclickAttr.match(/'([^']+)'/);
                    if (match && match[1]) {
                        switchTab(e, match[1]);
                    }
                }
            });
        });
    }
});


