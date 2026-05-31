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
    if (event) event.preventDefault();
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

// 4. NGHIỆP VỤ: KHÁM BỆNH & KÊ ĐƠN (FETCH THUỐC TỪ DATABASE)
async function openMedicalRecord(maLK, tenBN, isEdit = false) {
    const app = currentAppointments.find(a => a.id == maLK);
    let rawTrieuChung = app ? (app.mo_ta_trieu_chung || '') : '';

    let extractedImages = [];
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(rawTrieuChung)) !== null) {
        extractedImages.push(match[1]);
    }

    let textTrieuChung = rawTrieuChung.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
    textTrieuChung = textTrieuChung.replace(/<[^>]*>?/gm, '');
    if (!textTrieuChung) textTrieuChung = '<span style="color:#94a3b8; font-style:italic;">Không có thông tin</span>';

    let imageHtml = '';
    if (extractedImages.length > 0) {
        let imgTags = extractedImages.map(src => `
            <div class="symptom-img-container" style="position: relative; display: inline-block; cursor: pointer;" onclick="Swal.fire({title: 'Hình ảnh chi tiết', imageUrl: '${src}', imageAlt: 'Triệu chứng', width: 'auto', showCloseButton: true, showConfirmButton: false})">
                <img src="${src}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #fcd34d; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div class="symptom-img-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); border-radius: 8px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s;">
                    <span style="color: white; font-size: 11px; font-weight: bold; text-align: center;"><i class="fa-solid fa-magnifying-glass-plus"></i><br>Xem</span>
                </div>
            </div>
        `).join('');
        imageHtml = `<div style="display: flex; gap: 10px; margin-left: 20px; padding-left: 20px; border-left: 2px dashed #fcd34d; flex-wrap: wrap; justify-content: flex-end; max-width: 250px;">${imgTags}</div>`;
    }

    let currentPrescriptions = [];
    let parsedChanDoan = "";
    let hasNewDonThuoc = false;

    if (isEdit) {
        let oldNote = app ? (app.ghi_chu_cua_bac_si || '') : '';
        // Chẩn đoán giờ chỉ nằm trong ghi_chu (không nối chuỗi thuốc nữa)
        if (oldNote.includes("Chẩn đoán:")) {
            parsedChanDoan = oldNote.replace("Chẩn đoán:", "").split("\n\nĐơn thuốc:")[0].trim();
        } else {
            parsedChanDoan = oldNote;
        }

        // Fetch đơn thuốc từ bảng DonThuoc (API) thay vì parse regex text
        try {
            const dtRes = await fetch(`${window.API_BASE}/api/don-thuoc/${maLK}`);
            if (dtRes.ok) {
                const dtData = await dtRes.json();
                if (Array.isArray(dtData) && dtData.length > 0) {
                    hasNewDonThuoc = true;
                    currentPrescriptions = dtData.map(dt => ({
                        thuocId: dt.thuoc_id,
                        ten: dt.ten_thuoc,
                        donVi: dt.don_vi,
                        soLuong: dt.so_luong,
                        lieu: dt.lieu_dung || '',
                        gia: parseFloat(dt.gia_thuoc) || 0
                    }));
                }
            }
        } catch (err) {
            console.error('Lỗi fetch đơn thuốc cũ:', err);
        }

        // Tương thích ngược: Nếu bảng mới không có, parse từ text ghi chú cũ để load lên Form
        if (!hasNewDonThuoc && oldNote.includes('Đơn thuốc:')) {
            const thuocMatch = oldNote.match(/Đơn thuốc:([\s\S]*?)(?:$|Tổng tiền)/);
            if (thuocMatch && thuocMatch[1]) {
                const lines = thuocMatch[1].trim().split('\n');
                lines.forEach(line => {
                    const m = line.trim().match(/^\d+\.\s*(.+?)\s*\((.+?)\)\s*x(\d+)\s*-\s*HDSD:\s*(.+?)\s*-\s*([\d,.]+)/);
                    if (m) {
                        const ten = m[1].trim();
                        const donVi = m[2].trim();
                        const soLuong = parseInt(m[3]);
                        const lieu = m[4].trim();
                        const thanhTienStr = m[5].replace(/\./g, '').replace(/,/g, '');
                        const gia = parseFloat(thanhTienStr) / soLuong;
                        // Lưu ý: thuocId sẽ là null do dữ liệu cũ không lưu ID. 
                        // Khi lưu lại (POST API), nếu thuocId = null, backend sẽ báo lỗi (do DB bắt buộc có thuoc_id).
                        // Vì vậy ta tạm gán id = null, sau đó trong hàm render/save ta cần xử lý hoặc bắt bác sĩ chọn lại.
                        currentPrescriptions.push({ thuocId: null, ten, donVi, soLuong, lieu, gia, isOld: true });
                    }
                });
            }
        }
    }

    // Fetch danh sách thuốc từ Database (chỉ lấy thuốc đang hoạt động)
    let danhSachThuocDB = [];
    try {
        const res = await fetch(`${window.API_BASE}/api/thuoc/active`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) danhSachThuocDB = data;
            
            // Map ID cho dữ liệu cũ (nếu có)
            if (currentPrescriptions.length > 0) {
                currentPrescriptions.forEach(p => {
                    if (p.thuocId === null && p.isOld) {
                        const matchedThuoc = danhSachThuocDB.find(t => t.ten_thuoc.toLowerCase() === p.ten.toLowerCase());
                        if (matchedThuoc) p.thuocId = matchedThuoc.id;
                    }
                });
            }
        }
    } catch (err) {
        console.error('Lỗi fetch danh sách thuốc:', err);
    }

    // Tạo HTML options cho dropdown chọn thuốc
    let thuocOptionsHtml = '<option value="" disabled selected>-- Chọn thuốc --</option>';
    if (Array.isArray(danhSachThuocDB)) {
        danhSachThuocDB.forEach(t => {
            const gia = Number(t.gia_thuoc || 0).toLocaleString('vi-VN');
            thuocOptionsHtml += `<option value="${t.id}" data-lieu="${t.lieu_dung_mac_dinh || ''}" data-don-vi="${t.don_vi}" data-gia="${t.gia_thuoc || 0}" data-ten="${t.ten_thuoc}">${t.ten_thuoc} (${t.don_vi}) - ${gia}đ</option>`;
        });
    }

    Swal.fire({
        title: isEdit ? `Sửa hồ sơ: ${tenBN} (#LK${maLK})` : `Khám bệnh: ${tenBN} (#LK${maLK})`,
        html: `
            <style>.symptom-img-container:hover .symptom-img-overlay { opacity: 1 !important; }</style>
            <div style="text-align: left; margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 20px;">
                <!-- Khu vực 0: Triệu chứng từ Bệnh nhân -->
                <div style="background: #fffbeb; padding: 15px; border-radius: 12px; border: 1px solid #fde68a; box-shadow: 0 2px 5px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1;">
                        <label style="font-weight: 700; color: #d97706; display: block; margin-bottom: 8px; font-size: 15px;"><i class="fa-solid fa-clipboard-user" style="color: #f59e0b;"></i>Triệu chứng của bệnh nhân:</label>
                        <div style="font-size: 14px; color: #334155; line-height: 1.6; word-break: break-word;">
                            ${textTrieuChung}
                        </div>
                    </div>
                    ${imageHtml}
                </div>

                <!-- Khu vực 1: Chẩn đoán -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px; font-size: 15px;"><i class="fa-solid fa-stethoscope" style="color: #0ea5e9;"></i> Chẩn đoán bệnh (*):</label>
                    <textarea id="chan_doan" class="swal2-textarea" placeholder="Nhập chẩn đoán lâm sàng..." style="width: 100%; margin: 0; height: 80px; box-sizing: border-box; font-size: 14px; padding: 12px; border-radius: 8px; border-color: #cbd5e1;">${parsedChanDoan}</textarea>
                </div>
                
                <!-- Khu vực 2: Kê đơn thuốc từ Database -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 12px; font-size: 15px;"><i class="fa-solid fa-pills" style="color: #10b981;"></i> Kê đơn thuốc:</label>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
                        <select id="chon_thuoc" class="swal2-input" style="flex: 2; margin: 0; height: 42px; font-size: 13px; border-radius: 8px; border-color: #cbd5e1; padding: 0 8px;">
                            ${thuocOptionsHtml}
                        </select>
                        <input type="number" id="so_luong_thuoc" class="swal2-input" value="1" min="1" max="100" placeholder="SL" style="flex: 0 0 65px; margin: 0; height: 42px; font-size: 14px; border-radius: 8px; border-color: #cbd5e1; text-align: center;">
                        <button type="button" id="btn_add_thuoc" style="background: #0ea5e9; color: white; border: none; height: 42px; padding: 0 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; white-space: nowrap;"><i class="fa-solid fa-plus"></i> Thêm</button>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 15px;">
                        <input type="text" id="lieu_dung" class="swal2-input" placeholder="Liều dùng (tự động điền khi chọn thuốc)" style="flex: 1; margin: 0; height: 42px; font-size: 13px; border-radius: 8px; border-color: #cbd5e1;">
                    </div>
                    
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f1f5f9; position: sticky; top: 0; z-index: 1;">
                                <tr>
                                    <th style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Tên thuốc</th>
                                    <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569; font-weight: 600; width: 50px;">SL</th>
                                    <th style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569; font-weight: 600;">Liều dùng</th>
                                    <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-weight: 600; width: 90px;">Thành tiền</th>
                                    <th style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; width: 40px; color: #475569;"><i class="fa-solid fa-gear"></i></th>
                                </tr>
                            </thead>
                            <tbody id="ds_thuoc_body">
                                <tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Chưa có thuốc nào trong đơn</td></tr>
                            </tbody>
                            <tfoot id="ds_thuoc_footer" style="display: none;">
                                <tr style="background: #f0fdf4;">
                                    <td colspan="3" style="padding: 10px 12px; font-weight: 700; color: #166534; text-align: right;">Tổng tiền thuốc:</td>
                                    <td style="padding: 10px 8px; font-weight: 700; color: #166534; text-align: right;" id="tong_tien_thuoc">0 đ</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Nút xuất PDF Đơn thuốc -->
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" id="btn_export_pdf" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-file-pdf"></i> Xuất đơn thuốc (PDF)</button>
            </div>
        `,
        width: '800px',
        showCancelButton: true,
        confirmButtonText: isEdit ? '<i class="fa-solid fa-check"></i> Lưu thay đổi' : '<i class="fa-solid fa-check"></i> Hoàn tất khám',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#0284C7',
        didOpen: () => {
            const btnAdd = document.getElementById('btn_add_thuoc');
            const btnExportPdf = document.getElementById('btn_export_pdf');
            const tbody = document.getElementById('ds_thuoc_body');
            const tfoot = document.getElementById('ds_thuoc_footer');
            const selectThuoc = document.getElementById('chon_thuoc');
            const inputLieu = document.getElementById('lieu_dung');
            const inputSoLuong = document.getElementById('so_luong_thuoc');

            // Khởi tạo Select2 cho ô chọn thuốc để có tính năng Search
            $('#chon_thuoc').select2({
                dropdownParent: $('.swal2-popup'),
                width: '100%',
                placeholder: '-- Tìm và chọn thuốc --'
            });

            // Khi chọn thuốc → tự động điền liều dùng mặc định
            $('#chon_thuoc').on('change', function () {
                const selectedOption = $(this).find('option:selected')[0];
                if (selectedOption && selectedOption.value) {
                    const lieuMacDinh = selectedOption.getAttribute('data-lieu') || '';
                    inputLieu.value = lieuMacDinh;
                    inputSoLuong.focus();
                }
            });

            // Hàm tính tổng tiền thuốc
            const tinhTongTien = () => {
                let tong = 0;
                currentPrescriptions.forEach(t => { tong += (t.gia || 0) * (t.soLuong || 1); });
                return tong;
            };

            // Hàm render danh sách thuốc ra bảng
            const renderThuoc = () => {
                if (currentPrescriptions.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Chưa có thuốc nào trong đơn</td></tr>';
                    tfoot.style.display = 'none';
                    return;
                }
                tfoot.style.display = '';
                tbody.innerHTML = currentPrescriptions.map((t, idx) => {
                    const thanhTien = Number((t.gia || 0) * (t.soLuong || 1)).toLocaleString('vi-VN');
                    return `
                    <tr style="transition: 0.2s; cursor: default;">
                        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${t.ten} <span style="color:#64748b; font-weight:400; font-size:12px;">(${t.donVi})</span></td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #0284c7;">${t.soLuong}</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${t.lieu}</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${thanhTien}đ</td>
                        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <button type="button" style="background: #fee2e2; border: none; color: #ef4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; transition: 0.2s;" onclick="window.removeThuoc(${idx})" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>`;
                }).join('');
                document.getElementById('tong_tien_thuoc').textContent = Number(tinhTongTien()).toLocaleString('vi-VN') + ' đ';
            };

            // Xóa thuốc khỏi đơn
            window.removeThuoc = (index) => {
                currentPrescriptions.splice(index, 1);
                renderThuoc();
            };

            if (isEdit) {
                renderThuoc();
            }

            // Thêm thuốc mới
            btnAdd.addEventListener('click', () => {
                const selectedOption = $('#chon_thuoc').find('option:selected')[0];
                if (!selectedOption || !selectedOption.value) {
                    Swal.showValidationMessage('Vui lòng chọn thuốc từ danh sách!');
                    setTimeout(() => Swal.resetValidationMessage(), 2000);
                    return;
                }
                const lieu = inputLieu.value.trim();
                if (!lieu) {
                    Swal.showValidationMessage('Vui lòng nhập liều dùng!');
                    setTimeout(() => Swal.resetValidationMessage(), 2000);
                    return;
                }

                const ten = selectedOption.getAttribute('data-ten');
                const donVi = selectedOption.getAttribute('data-don-vi');
                const gia = parseFloat(selectedOption.getAttribute('data-gia')) || 0;
                const soLuong = parseInt(inputSoLuong.value) || 1;

                // Kiểm tra trùng thuốc
                const existingIndex = currentPrescriptions.findIndex(t => t.ten.toLowerCase() === ten.toLowerCase());
                if (existingIndex !== -1) {
                    currentPrescriptions[existingIndex].soLuong += soLuong;
                    currentPrescriptions[existingIndex].lieu = lieu;
                } else {
                    currentPrescriptions.push({ thuocId: parseInt(selectedOption.value), ten, donVi, gia, soLuong, lieu });
                }

                $('#chon_thuoc').val('').trigger('change');
                inputLieu.value = '';
                inputSoLuong.value = 1;
                $('#chon_thuoc').select2('open'); // Mở lại dropdown để chọn tiếp
                renderThuoc();
            });

            // XUẤT PDF ĐƠN THUỐC
            btnExportPdf.addEventListener('click', () => {
                const chanDoan = document.getElementById('chan_doan').value.trim();
                if (!chanDoan && currentPrescriptions.length === 0) {
                    Swal.showValidationMessage('Vui lòng nhập chẩn đoán hoặc kê đơn trước khi xuất!');
                    setTimeout(() => Swal.resetValidationMessage(), 2500);
                    return;
                }
                exportPrescriptionPDF(tenBN, maLK, chanDoan, currentPrescriptions);
            });
        },
        preConfirm: () => {
            const chanDoan = document.getElementById('chan_doan').value.trim();
            if (!chanDoan) {
                Swal.showValidationMessage('Vui lòng nhập Chẩn đoán bệnh!');
                return false;
            }

            // Kiểm tra xem có thuốc cũ nào không map được ID không
            const invalidPrescriptions = currentPrescriptions.filter(p => !p.thuocId);
            if (invalidPrescriptions.length > 0) {
                const invalidNames = invalidPrescriptions.map(p => p.ten).join(', ');
                Swal.showValidationMessage(`Thuốc cũ: "${invalidNames}" không khớp CSDL. Vui lòng xóa (nút rác) và chọn lại từ danh sách!`);
                return false;
            }

            // Chỉ lưu chẩn đoán vào ghi_chu, đơn thuốc lưu riêng vào bảng DonThuoc
            let ghiChu = `Chẩn đoán: ${chanDoan}`;

            return { ghi_chu: ghiChu, prescriptions: currentPrescriptions };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // 1. Lưu chẩn đoán vào LichKham
                const url = isEdit ? `${window.API_BASE}/api/appointments/${maLK}/note` : `${window.API_BASE}/api/appointments/${maLK}/status`;
                const body = isEdit ? { ghi_chu_cua_bac_si: result.value.ghi_chu } : { trang_thai: 'Done', ghi_chu_cua_bac_si: result.value.ghi_chu };
                const res = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    // 2. Lưu đơn thuốc vào bảng DonThuoc (nếu có)
                    if (result.value.prescriptions && result.value.prescriptions.length > 0) {
                        const danhSachThuoc = result.value.prescriptions.map(t => ({
                            thuoc_id: t.thuocId,
                            so_luong: t.soLuong,
                            lieu_dung: t.lieu,
                            ghi_chu: ''
                        }));

                        const dtUrl = isEdit ? `${window.API_BASE}/api/don-thuoc/${maLK}` : `${window.API_BASE}/api/don-thuoc`;
                        const dtMethod = isEdit ? 'PUT' : 'POST';
                        const dtBody = isEdit ? { danh_sach_thuoc: danhSachThuoc } : { lich_kham_id: maLK, danh_sach_thuoc: danhSachThuoc };

                        await fetch(dtUrl, {
                            method: dtMethod,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(dtBody)
                        });
                    } else if (isEdit) {
                        // Nếu sửa mà xóa hết thuốc → xóa đơn thuốc cũ
                        await fetch(`${window.API_BASE}/api/don-thuoc/${maLK}`, { method: 'DELETE' });
                    }

                    Swal.fire('Thành công!', isEdit ? 'Ghi chú đã được cập nhật.' : 'Hồ sơ bệnh án đã được lưu.', 'success');
                    fetchAppointments(); // Gọi lại hàm load dữ liệu
                } else {
                    Swal.fire('Lỗi', 'Không thể lưu', 'error');
                }
            } catch (e) { console.error(e); }
        }
    });
}

// HÀM XUẤT ĐƠN THUỐC DẠNG PDF (JSPDF)
function exportPrescriptionPDF(tenBenhNhan, maLK, chanDoan, danhSachThuoc) {
    // Tải jsPDF và autoTable từ CDN nếu chưa có
    const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const generatePDF = async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const isFormOpen = !!document.getElementById('chan_doan'); // Kiểm tra form khám bệnh có đang mở

        try {
            if (!isFormOpen) {
                Swal.fire({
                    title: 'Đang tạo Đơn thuốc PDF',
                    html: 'Hệ thống đang tải font chữ tiếng Việt, vui lòng chờ...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
            } else {
                Swal.showLoading(); // Load nhẹ nếu in từ bên trong form khám
            }

            // Tải font Roboto Regular
            const resReg = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf');
            const bufReg = await resReg.arrayBuffer();
            let binReg = '';
            const bytesReg = new Uint8Array(bufReg);
            for (let i = 0; i < bytesReg.byteLength; i++) binReg += String.fromCharCode(bytesReg[i]);
            doc.addFileToVFS('Roboto-Regular.ttf', window.btoa(binReg));
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

            // Tải font Roboto Bold
            const resBold = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf');
            const bufBold = await resBold.arrayBuffer();
            let binBold = '';
            const bytesBold = new Uint8Array(bufBold);
            for (let i = 0; i < bytesBold.byteLength; i++) binBold += String.fromCharCode(bytesBold[i]);
            doc.addFileToVFS('Roboto-Bold.ttf', window.btoa(binBold));
            doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

            doc.setFont('Roboto', 'normal');
            if (isFormOpen) Swal.hideLoading();
        } catch (e) {
            console.error('Lỗi nhúng font tiếng Việt:', e);
            if (!isFormOpen) {
                Swal.fire('Lỗi', 'Không thể tải font chữ. Vui lòng kiểm tra kết nối mạng!', 'error');
            } else {
                Swal.hideLoading();
                Swal.showValidationMessage('Lỗi tải font chữ tiếng Việt!');
            }
            return;
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const userInfo = JSON.parse(localStorage.getItem('doctorInfo') || '{}');
        const tenBacSi = userInfo.ho_ten || userInfo.ten_dang_nhap || 'Bác sĩ';

        const now = new Date();
        const ngayIn = `Ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;

        // === HEADER ===
        doc.setFontSize(22);
        doc.setTextColor(2, 132, 199);
        doc.setFont('Roboto', 'bold');
        doc.text('TT MEDICAL', 20, 25);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('Roboto', 'normal');
        doc.text('Phòng Khám Đa Khoa Chất Lượng Cao', 20, 32);
        doc.text('Hotline: 1900 6868', 20, 38);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Mã phiếu: LK${maLK}`, pageWidth - 20, 25, { align: 'right' });

        // Đường kẻ header
        doc.setDrawColor(2, 132, 199);
        doc.setLineWidth(0.8);
        doc.line(20, 43, pageWidth - 20, 43);

        // === TITLE ===
        doc.setFontSize(24);
        doc.setTextColor(0, 0, 0);
        doc.setFont('Roboto', 'bold');
        doc.text('ĐƠN THUỐC', pageWidth / 2, 58, { align: 'center' });

        // === THÔNG TIN BỆNH NHÂN ===
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('Roboto', 'normal');

        const removeVietnamese = (str) => str; // Giữ nguyên Tiếng Việt có dấu

        doc.text(`Họ và tên bệnh nhân: ${tenBenhNhan.toUpperCase()}`, 20, 72);
        doc.text(`Chẩn đoán lâm sàng: ${chanDoan || '(Chưa chẩn đoán)'}`, 20, 80);

        // === BẢNG ĐƠN THUỐC ===
        let yPos = 92;

        if (danhSachThuoc.length > 0) {
            doc.setFontSize(13);
            doc.text('Chỉ định dùng thuốc:', 20, yPos);
            yPos += 5;

            const tableData = danhSachThuoc.map((t, i) => {
                const thanhTien = (t.gia || 0) * (t.soLuong || 1);
                return [
                    (i + 1).toString(),
                    t.ten,
                    t.donVi || '',
                    (t.soLuong || 1).toString(),
                    t.lieu,
                    Number(thanhTien).toLocaleString('vi-VN') + 'đ'
                ];
            });

            // Tính tổng tiền
            let tongTien = 0;
            danhSachThuoc.forEach(t => { tongTien += (t.gia || 0) * (t.soLuong || 1); });

            doc.autoTable({
                startY: yPos,
                head: [['STT', 'Tên thuốc', 'Đơn vị', 'SL', 'Liều dùng', 'Thành tiền']],
                body: tableData,
                foot: [['', '', '', '', 'Tổng tiền thuốc:', Number(tongTien).toLocaleString('vi-VN') + ' VNĐ']],
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 4, font: 'Roboto' },
                headStyles: { fillColor: [2, 132, 199], textColor: 255, fontStyle: 'bold', halign: 'center', font: 'Roboto' },
                footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold', font: 'Roboto' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12 },
                    1: { cellWidth: 45 },
                    2: { halign: 'center', cellWidth: 20 },
                    3: { halign: 'center', cellWidth: 15 },
                    4: { cellWidth: 55 },
                    5: { halign: 'right', cellWidth: 28 }
                },
                margin: { left: 20, right: 20 }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text('(Bác sĩ không kê thuốc)', 20, yPos + 5);
            yPos += 20;
        }

        // === CHỮ KÝ ===
        const signX = pageWidth - 70;
        if (yPos > 240) {
            doc.addPage();
            yPos = 30;
        }

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Hà Nội, ${ngayIn}`, signX, yPos, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('Roboto', 'bold');
        doc.text('Bác sĩ điều trị', signX, yPos + 8, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('Roboto', 'normal');
        doc.text(`BS. ${tenBacSi}`, signX, yPos + 45, { align: 'center' });

        // Lưu file PDF
        doc.save(`Don_Thuoc_LK${maLK}_${tenBenhNhan.replace(/\s+/g, '_')}.pdf`);

        // Hiển thị thông báo thành công đẹp mắt
        if (!isFormOpen) {
            Swal.fire({
                title: 'Xuất file thành công!',
                text: `Đơn thuốc của bệnh nhân ${tenBenhNhan} đã được lưu về máy.`,
                icon: 'success',
                confirmButtonColor: '#10b981',
                confirmButtonText: '<i class="fa-solid fa-check"></i> Đóng'
            });
        } else {
            const btnExportPdf = document.getElementById('btn_export_pdf');
            if (btnExportPdf) {
                const originalText = btnExportPdf.innerHTML;
                btnExportPdf.innerHTML = '<i class="fa-solid fa-check"></i> Đã tải xong!';
                setTimeout(() => { btnExportPdf.innerHTML = originalText; }, 3000);
            }
        }
    };

    // Load thư viện jsPDF nếu chưa có
    if (typeof window.jspdf === 'undefined') {
        const isFormOpen = !!document.getElementById('chan_doan');
        if (!isFormOpen) {
            Swal.fire({
                title: 'Đang tải thư viện PDF...',
                text: 'Lần đầu xuất file có thể mất vài giây.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
        } else {
            Swal.showLoading();
        }

        Promise.all([
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        ]).then(() => {
            return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
        }).then(() => {
            generatePDF();
        }).catch(err => {
            console.error('Lỗi tải thư viện PDF:', err);
            if (!isFormOpen) {
                Swal.fire('Lỗi', 'Không thể tải thư viện xuất PDF. Vui lòng kiểm tra kết nối mạng!', 'error');
            } else {
                Swal.hideLoading();
                Swal.showValidationMessage('Lỗi tải thư viện PDF!');
            }
        });
    } else {
        generatePDF();
    }
}

// HÀM XUẤT LẠI ĐƠN THUỐC PDF (TỪ DANH SÁCH ĐÃ KHÁM)
window.exportDoneAppointmentPdf = async (maLK) => {
    const app = currentAppointments.find(a => a.id == maLK);
    if (!app) return;

    let chanDoan = 'Chưa chẩn đoán';
    let danhSachThuoc = [];
    const ghiChu = app.ghi_chu_cua_bac_si || '';

    // Lấy chẩn đoán từ ghi chú
    if (ghiChu.includes("Chẩn đoán:")) {
        chanDoan = ghiChu.replace("Chẩn đoán:", "").split("\n\nĐơn thuốc:")[0].trim();
    } else {
        chanDoan = ghiChu.trim() || 'Chưa có chẩn đoán';
    }

    let hasNewDonThuoc = false;
    // Fetch đơn thuốc từ bảng DonThuoc (API)
    try {
        const dtRes = await fetch(`${window.API_BASE}/api/don-thuoc/${maLK}`);
        if (dtRes.ok) {
            const dtData = await dtRes.json();
            if (Array.isArray(dtData) && dtData.length > 0) {
                hasNewDonThuoc = true;
                danhSachThuoc = dtData.map(dt => ({
                    ten: dt.ten_thuoc,
                    donVi: dt.don_vi,
                    soLuong: dt.so_luong,
                    lieu: dt.lieu_dung || '',
                    gia: parseFloat(dt.gia_thuoc) || 0
                }));
            }
        }
    } catch (err) {
        console.error('Lỗi fetch đơn thuốc để xuất PDF:', err);
    }

    // Tương thích ngược: Nếu bảng mới không có, parse từ text ghi chú cũ
    if (!hasNewDonThuoc && ghiChu.includes('Đơn thuốc:')) {
        const thuocMatch = ghiChu.match(/Đơn thuốc:([\s\S]*?)(?:$|Tổng tiền)/);
        if (thuocMatch && thuocMatch[1]) {
            const lines = thuocMatch[1].trim().split('\n');
            lines.forEach(line => {
                const m = line.trim().match(/^\d+\.\s*(.+?)\s*\((.+?)\)\s*x(\d+)\s*-\s*HDSD:\s*(.+?)\s*-\s*([\d,.]+)/);
                if (m) {
                    const ten = m[1].trim();
                    const donVi = m[2].trim();
                    const soLuong = parseInt(m[3]);
                    const lieu = m[4].trim();
                    const thanhTienStr = m[5].replace(/\./g, '').replace(/,/g, '');
                    const gia = parseFloat(thanhTienStr) / soLuong;
                    danhSachThuoc.push({ ten, donVi, soLuong, lieu, gia });
                }
            });
        }
    }

    exportPrescriptionPDF(app.ten_benh_nhan, app.id, chanDoan, danhSachThuoc);
};

// 5. NGHIỆP VỤ: DUYỆT & HỦY LỊCH
function approveAppointment(maLK) {
    Swal.fire({ title: 'Duyệt lịch?', text: `Chấp nhận lịch #${maLK}?`, icon: 'info', showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Duyệt' })
        .then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trang_thai: 'Approved' })
                    });
                    if (res.ok) {
                        Swal.fire('Đã duyệt!', '', 'success');
                        fetchAppointments(); // Load lại data
                    } else {
                        Swal.fire('Lỗi!', 'Không thể duyệt lịch hẹn', 'error');
                    }
                } catch (e) { console.error(e); }
            }
        });
}
function cancelAppointment(maLK) {
    Swal.fire({ title: 'Hủy lịch?', input: 'text', inputPlaceholder: 'Lý do hủy...', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Hủy lịch' })
        .then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    const res = await fetch(`${window.API_BASE}/api/appointments/${maLK}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trang_thai: 'Cancelled', ghi_chu_cua_bac_si: result.value })
                    });
                    if (res.ok) {
                        Swal.fire('Đã hủy!', '', 'success');
                        fetchAppointments(); // Load lại data
                    } else {
                        Swal.fire('Lỗi!', 'Không thể hủy lịch hẹn', 'error');
                    }
                } catch (e) { console.error(e); }
            }
        });
}

// SỬA GHI CHÚ / ĐƠN THUỐC CỦA LỊCH ĐÃ KHÁM
function editMedicalRecord(maLK) {
    const app = currentAppointments.find(a => a.id == maLK);
    if (!app) return;
    openMedicalRecord(maLK, app.ten_benh_nhan, true);
}

// 6. NGHIỆP VỤ: TRẢ LỜI CÂU HỎI Q&A
function replyQA(maCH) {
    const question = currentQA.find(q => q.id === maCH);
    if (!question) return;
    const currentReply = question && question.tra_loi ? question.tra_loi : '';
    const isEditing = !!currentReply;

    Swal.fire({
        title: isEditing ? 'Sửa câu trả lời' : 'Phản hồi bệnh nhân',
        width: '600px',
        customClass: {
            popup: 'saas-modal',
            container: 'saas-backdrop',
            confirmButton: 'saas-btn-primary',
            cancelButton: 'saas-btn-outline'
        },
        html: `
            <div class="qa-reply-container">
                <div class="qa-question-box">
                    <p class="qa-question-text"><strong><i class="fa-solid fa-circle-question qa-icon-question"></i> Câu hỏi:</strong> <br><span class="qa-question-content">${question.noi_dung ? question.noi_dung.replace(/\n/g, '<br>') : ''}</span></p>
                </div>
                <label class="saas-label qa-reply-label"><i class="fa-solid fa-user-doctor qa-icon-doctor"></i> Câu trả lời của Bác sĩ (*)</label>
                <textarea id="qa_reply_content" class="saas-input qa-reply-textarea" placeholder="Nhập nội dung tư vấn chi tiết...">${currentReply}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: isEditing ? '<i class="fa-solid fa-check"></i> Cập nhật' : '<i class="fa-solid fa-paper-plane"></i> Gửi phản hồi',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
            const replyContent = document.getElementById('qa_reply_content').value.trim();
            if (!replyContent) {
                Swal.showValidationMessage('Vui lòng nhập nội dung trả lời!');
                return false;
            }
            return replyContent;
        }
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

        // Cập nhật badge thông báo trên thanh menu cho tab Hỏi đáp
        const navHoiDapLinks = document.querySelectorAll('.nav-links a[onclick*="tab-hoi-dap"], .mobile-nav-links a[onclick*="tab-hoi-dap"]');
        navHoiDapLinks.forEach(link => {
            let badge = link.querySelector('.badge-noti');
            if (pendingQA > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge-noti';
                    link.appendChild(badge);
                }
                badge.innerText = pendingQA > 99 ? '99+' : pendingQA;
            } else if (badge) {
                badge.remove();
            }
        });

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
            ? `<div style="background: #F0FDF4; padding: 16px; border-radius: 12px; border: 1px solid #A7F3D0; border-left: 5px solid #10B981; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                     <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px dashed #D1FAE5; padding-bottom: 8px;">
                       <span style="color: #059669; font-size: 15px; font-weight: 700;"><i class="fa-solid fa-user-doctor"></i> ${nguoiDaTraLoi} phản hồi:</span>
                       <button onclick="replyQA(${q.id})" style="background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 4px 10px; color: #0284C7; cursor: pointer; font-size: 13px; font-weight: 600; transition: 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='white'"><i class="fa-solid fa-pen"></i> Sửa</button>
                     </div>
                     <p style="margin: 0; color: #1E293B; font-size: 15px; line-height: 1.6; word-break: break-word; white-space: pre-wrap;">${q.tra_loi}</p>
                   </div>`
            : `<button class="btn btn-primary" onclick="replyQA(${q.id})" style="background: #0284C7; color: white; padding: 8px 16px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);" onmouseover="this.style.background='#0369A1'" onmouseout="this.style.background='#0284C7'"><i class="fa-solid fa-reply"></i> Phản hồi bệnh nhân</button>`;

        qaHTML += `
                <div class="qa-item" style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 15px; transition: 0.2s;">
                    <div class="qa-header" style="border-bottom: 1px solid #F1F5F9; padding-bottom: 12px; margin-bottom: 12px;">
                        <h4 style="color: #0F172A; font-size: 17px; font-weight: 700; word-break: break-word; line-height: 1.5; margin: 0 0 5px 0;">${displayTieuDe} <span style="font-size: 13px; color: #94A3B8; font-weight: 500;">(Mã CH: #${q.id})</span></h4>
                        <span class="qa-date" style="font-size: 13px; color: #64748B; font-weight: 500;"><i class="fa-regular fa-clock"></i> ${dateStr} <span style="margin: 0 8px;">|</span> <i class="fa-regular fa-user"></i> Người hỏi: <strong style="color: #475569;">${nguoiHoi}</strong></span>
                    </div>
                    <div class="qa-content" style="color: #475569; font-size: 15px; word-break: break-word; white-space: pre-wrap; line-height: 1.6; margin-bottom: 15px;">${q.noi_dung}</div>
                    <div>${btnHtml}</div>
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
        window.scrollTo({ top: y, behavior: 'smooth' });
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
            <div style="text-align: left;">
                <label class="saas-label"><i class="fa-regular fa-calendar" style="color: #0ea5e9; margin-right: 5px;"></i> Ngày làm việc (*)</label>
                <input type="date" id="shift_date" class="saas-input" value="${defaultDate}" min="${localTodayStr}" style="cursor: pointer;">
                
                <div style="display: flex; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1;">
                        <label class="saas-label" style="margin-top: 0;"><i class="fa-regular fa-clock" style="color: #10b981; margin-right: 5px;"></i> Từ giờ (*)</label>
                        <input type="time" id="shift_start" class="saas-input" value="${defaultStart}" step="1800" style="cursor: pointer;">
                    </div>
                    <div style="flex: 1;">
                        <label class="saas-label" style="margin-top: 0;"><i class="fa-solid fa-clock-rotate-left" style="color: #f59e0b; margin-right: 5px;"></i> Đến giờ (*)</label>
                        <input type="time" id="shift_end" class="saas-input" value="${defaultEnd}" step="1800" style="cursor: pointer;">
                    </div>
                </div>

                <label class="saas-label"><i class="fa-solid fa-users" style="color: #8b5cf6; margin-right: 5px;"></i> Số lượng Bệnh nhân tối đa (*)</label>
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
                if (res.ok) {
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
        const cancelledCount = currentAppointments.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === 'cancelled').length;

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

        // Đếm số ca khám trong ngày hôm nay nhưng CHƯA KHÁM (chỉ tính trạng thái pending và approved)
        const todayPendingCount = currentAppointments.filter(app => {
            if (!app.ngay_lam_viec) return false;
            const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
            return app.ngay_lam_viec.split('T')[0] === localDateStr && (status === 'pending' || status === 'approved');
        }).length;

        // ĐỒNG BỘ THANH LỌC LỊCH KHÁM (CÓ 4 NÚT)
        const filterBtns = document.querySelectorAll('.filter-btn');
        if (filterBtns.length >= 4) {
            filterBtns[0].innerHTML = `Tất cả (${currentAppointments.length})`;
            filterBtns[1].innerHTML = `Chờ khám (${totalPending})`;
            filterBtns[2].innerHTML = `Đã khám (${doneCount})`;
            filterBtns[3].innerHTML = `Đã hủy (${cancelledCount})`;
            filterBtns[3].style.display = 'inline-block'; // Đảm bảo tab không bị ẩn

            // Gắn sự kiện để truyền đúng biến trạng thái lọc
            filterBtns[0].onclick = (e) => filterAppointments(e, 'all');
            filterBtns[1].onclick = (e) => filterAppointments(e, 'pending_all');
            filterBtns[2].onclick = (e) => filterAppointments(e, 'done');
            filterBtns[3].onclick = (e) => filterAppointments(e, 'cancelled');
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

        // Cập nhật badge thông báo trên thanh menu cho tab Lịch khám
        const navLichKhamLinks = document.querySelectorAll('.nav-links a[onclick*="tab-lich-kham"], .mobile-nav-links a[onclick*="tab-lich-kham"]');
        navLichKhamLinks.forEach(link => {
            let badge = link.querySelector('.badge-noti');
            if (todayPendingCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge-noti';
                    link.appendChild(badge);
                }
                badge.innerText = todayPendingCount > 99 ? '99+' : todayPendingCount;
            } else if (badge) {
                badge.remove();
            }
        });

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

    // THUẬT TOÁN SẮP XẾP LỊCH HẸN THEO YÊU CẦU: Ngày mới nhất -> cũ nhất
    const statusPriority = { 'pending': 1, 'approved': 1, 'done': 2, 'cancelled': 3 };

    filteredList.sort((a, b) => {
        // 1. Ưu tiên 1: Ngày khám từ Mới nhất -> Cũ nhất (Giảm dần)
        const dateA = new Date(a.ngay_lam_viec || 0).getTime();
        const dateB = new Date(b.ngay_lam_viec || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;

        // 2. Ưu tiên 2: Giờ khám từ Sớm nhất -> Muộn nhất trong cùng 1 ngày
        const timeA = a.gio_kham || a.khung_gio || "23:59";
        const timeB = b.gio_kham || b.khung_gio || "23:59";
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;

        // 3. Ưu tiên 3: Nếu cùng ngày cùng giờ thì xếp theo trạng thái (Chờ khám -> Đã khám -> Đã hủy)
        const statusA = a.trang_thai ? a.trang_thai.trim().toLowerCase() : '';
        const statusB = b.trang_thai ? b.trang_thai.trim().toLowerCase() : '';
        const pA = statusPriority[statusA] || 4;
        const pB = statusPriority[statusB] || 4;
        if (pA !== pB) return pA - pB;

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
        const safeName = app.ten_benh_nhan ? app.ten_benh_nhan.replace(/'/g, "\\'") : '';

        // LOGIC CHẶN KHÁM BỆNH KHI CHƯA ĐẾN GIỜ
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDateStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"

        const appDateStr = app.ngay_lam_viec ? app.ngay_lam_viec.split('T')[0] : '';
        const timeStr = app.gio_kham || app.khung_gio || '';
        const startTimeStr = timeStr.split(' - ')[0]; // Lấy giờ bắt đầu

        let isFuture = false;
        if (appDateStr > localDateStr) {
            isFuture = true;
        } else if (appDateStr === localDateStr && startTimeStr > currentTimeStr) {
            isFuture = true;
        }

        if (status === 'pending') {
            statusHtml = `<span class="badge badge-pending" style="background:#fef3c7; color:#d97706; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;"><span class="dot" style="background:#f59e0b; display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px;"></span>Chờ khám</span>`;
            if (isFuture) {
                actionHtml = `<button class="action-btn btn-primary" style="opacity: 0.5; cursor: not-allowed;" title="Chưa đến giờ khám"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>`;
            } else {
                actionHtml = `<button class="action-btn btn-primary" onclick="openMedicalRecord('${app.id}', '${safeName}')"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>`;
            }
        } else if (status === 'approved') {
            statusHtml = `<span class="badge badge-approved" style="background:#dcfce7; color:#166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;"><i class="fa-solid fa-circle-check" style="font-size: 14px; margin-right: 2px;"></i> Chờ khám</span>`;
            if (isFuture) {
                actionHtml = `<button class="action-btn btn-primary" style="opacity: 0.5; cursor: not-allowed;" title="Chưa đến giờ khám"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>`;
            } else {
                actionHtml = `<button class="action-btn btn-primary" onclick="openMedicalRecord('${app.id}', '${safeName}')"><i class="fa-solid fa-stethoscope"></i> Khám bệnh & Kê đơn</button>`;
            }
        } else if (status === 'cancelled') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã hủy</span>`;
            actionHtml = `<span style="font-size: 12px; color: #ef4444;"><i class="fa-solid fa-xmark"></i> Lịch đã bị hủy</span>`;
        } else if (status === 'done') {
            statusHtml = `<span class="badge" style="background:#f3f4f6; color:#4b5563; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã khám xong</span>`;
            actionHtml = `
                <button class="action-btn" onclick="exportDoneAppointmentPdf('${app.id}')" title="In đơn thuốc" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-right: 5px;"><i class="fa-solid fa-file-pdf"></i></button>
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

        let trieuChungText = app.mo_ta_trieu_chung || '';
        trieuChungText = trieuChungText.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
        trieuChungText = trieuChungText.replace(/<[^>]*>?/gm, ''); // Xóa thẻ HTML còn sót
        if (!trieuChungText) trieuChungText = '<span style="color:#9ca3af;">Không có</span>';

        trHTML += `
            <tr>
                <td><strong style="color: #0ea5e9; font-size: 16px;">STT: ${String(app.so_thu_tu || 1).padStart(2, '0')}</strong><br><span style="font-size: 12px; color: #64748b;">Mã LK: ${app.id}</span></td>
                <td><b>${app.ten_benh_nhan}</b><br><span style="color:var(--text-sub); font-size:12px;">${app.so_dien_thoai || 'Chưa cập nhật'}</span></td>
                <td>${formattedDate}<br><span style="color:var(--primary); font-size:12px; font-weight: 600;">${app.gio_kham || app.khung_gio}</span></td>
                <td style="max-width: 200px; white-space: normal;">${trieuChungText}</td>
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

        const docSpec = userInfo.ten_chuyen_khoa ? `Khoa: ${userInfo.ten_chuyen_khoa}` : "Chưa phân khoa";
        const elDoctorSpecNav = document.getElementById('doctorSpecialtyNav');
        if (elDoctorSpecNav) elDoctorSpecNav.innerText = docSpec;

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
                avatarImg.onerror = function () {
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

        // ĐỔ ẢNH BÁC SĨ VÀO HỒ SƠ CÁ NHÂN
        const profileAvatarImg = document.getElementById('hs_avatar');
        if (profileAvatarImg) {
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(docName)}&background=0284C7&color=fff&rounded=true&bold=true`;
            if (userInfo.anh_dai_dien) {
                if (userInfo.anh_dai_dien.startsWith('data:image') || userInfo.anh_dai_dien.startsWith('http')) {
                    profileAvatarImg.src = userInfo.anh_dai_dien;
                } else {
                    profileAvatarImg.src = `${window.API_BASE}/uploads/${userInfo.anh_dai_dien}`;
                }
                profileAvatarImg.onerror = function () {
                    this.onerror = null;
                    this.src = fallbackAvatar;
                };
            } else {
                profileAvatarImg.src = fallbackAvatar;
            }
        }

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
