window.API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ? 'http://127.0.0.1:3000' : 'https://doanphongkham.onrender.com');

const appointmentTbody = document.getElementById('appointmentTableBody');
let allAdminAppointments = [];
let currentAdminAppointmentPage = 1;
const adminAppointmentItemsPerPage = 10;

async function fetchAdminAppointments() {
    if (!appointmentTbody) return;
    try {
        const response = await fetch(`${window.API_BASE}/api/appointments`);
        const data = await response.json();
        allAdminAppointments = data.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));
        currentAdminAppSort = 'date_desc';
        renderAppointmentTable();
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu lịch hẹn:', error);
    }
}

function renderAppointmentTable() {
    if (!appointmentTbody) return;
    appointmentTbody.innerHTML = '';

    const searchInput = document.getElementById('searchAdminAppointment');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const dateInput = document.getElementById('filterAdminAppDate');
    const filterDate = dateInput ? dateInput.value : '';

    const statusInput = document.getElementById('filterAdminAppStatus');
    const filterStatus = statusInput ? statusInput.value : '';

    if (window.lastAdminAppKeyword !== keyword || window.lastAdminAppDate !== filterDate || window.lastAdminAppStatus !== filterStatus) {
        currentAdminAppointmentPage = 1;
        window.lastAdminAppKeyword = keyword;
        window.lastAdminAppDate = filterDate;
        window.lastAdminAppStatus = filterStatus;
    }

    let filteredList = allAdminAppointments;

    if (filterDate) {
        filteredList = filteredList.filter(app => {
            if (!app.ngay_lam_viec) return false;
            return app.ngay_lam_viec.split('T')[0] === filterDate;
        });
    }

    if (filterStatus) {
        filteredList = filteredList.filter(app => app.trang_thai && app.trang_thai.trim().toLowerCase() === filterStatus);
    }

    if (keyword) {
        filteredList = filteredList.filter(app => 
            (app.ten_benh_nhan && app.ten_benh_nhan.toLowerCase().includes(keyword)) ||
            (app.so_dien_thoai && app.so_dien_thoai.includes(keyword)) ||
            `lh${app.id}`.includes(keyword)
        );
    }

    if (filteredList.length === 0) {
        appointmentTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy lịch hẹn phù hợp.</td></tr>`;
        let paginationContainer = document.getElementById('admin_appointment_pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredList.length / adminAppointmentItemsPerPage);
    if (currentAdminAppointmentPage > totalPages) currentAdminAppointmentPage = totalPages;
    if (currentAdminAppointmentPage < 1) currentAdminAppointmentPage = 1;

    const startIndex = (currentAdminAppointmentPage - 1) * adminAppointmentItemsPerPage;
    const endIndex = startIndex + adminAppointmentItemsPerPage;
    const paginatedAppointments = filteredList.slice(startIndex, endIndex);

    paginatedAppointments.forEach(app => {
        let statusHtml = '';
        const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';

        if (status === 'pending') {
            statusHtml = `<span class="badge" style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Chờ duyệt</span>`;
        } else if (status === 'approved') {
            statusHtml = `<span class="badge" style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã duyệt</span>`;
        } else if (status === 'cancelled') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã hủy</span>`;
        } else if (status === 'done') {
            statusHtml = `<span class="badge" style="background:#e0f2fe; color:#0369a1; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Đã khám</span>`;
        } else {
            statusHtml = `<span class="badge" style="background:#e2e8f0; color:#475569; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Lỗi CSDL</span>`;
        }

        const dKham = new Date(app.ngay_lam_viec);
        const ngayKhamStr = `${String(dKham.getDate()).padStart(2, '0')}/${String(dKham.getMonth() + 1).padStart(2, '0')}/${dKham.getFullYear()}`;

        const dTao = new Date(app.ngay_tao);
        const ngayTaoStr = `${String(dTao.getDate()).padStart(2, '0')}/${String(dTao.getMonth() + 1).padStart(2, '0')}/${dTao.getFullYear()} ${String(dTao.getHours()).padStart(2, '0')}:${String(dTao.getMinutes()).padStart(2, '0')}`;

        let trieuChungText = app.mo_ta_trieu_chung || '';
        trieuChungText = trieuChungText.replace(/<br><div class="symptom-images-wrapper".*?<\/div>/g, '').trim();
        trieuChungText = trieuChungText.replace(/<[^>]*>?/gm, ''); // Xóa toàn bộ tag HTML
        if (!trieuChungText) trieuChungText = '<span style="color:#9ca3af;">Không có</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color: #0ea5e9; font-size: 14px;">STT: ${String(app.so_thu_tu || 1).padStart(2, '0')}</strong><br><span style="font-size: 12px; color: #64748b;">Mã LK: ${app.id}</span></td>
            <td><b>${app.ten_benh_nhan}</b><br><span style="color:#64748b; font-size:12px;">${app.so_dien_thoai}</span></td>
            <td>BS. ${app.ten_bac_si}</td>
            <td>${ngayKhamStr}</td>
            <td style="color:var(--primary-color); font-weight: 600;">${app.gio_kham || app.khung_gio}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${trieuChungText.replace(/"/g, '&quot;')}">${trieuChungText}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${app.ghi_chu_cua_bac_si || ''}">${app.ghi_chu_cua_bac_si || '<span style="color:#9ca3af;">Không có</span>'}</td>
            <td>${ngayTaoStr}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn edit" onclick="editAdminAppointmentNote(${app.id})" title="Sửa ghi chú" style="background-color: #f59e0b; margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteAdminAppointment(${app.id})" title="Hủy lịch hẹn"><i class="fa-solid fa-ban"></i></button>
            </td>
        `;
        appointmentTbody.appendChild(tr);
    });

    renderAdminAppointmentPagination(totalPages);
}

function renderAdminAppointmentPagination(totalPages) {
    let paginationContainer = document.getElementById('admin_appointment_pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'admin_appointment_pagination';
        paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 20px; width: 100%;';

        const table = appointmentTbody.closest('table');
        if (table && table.parentNode) {
            table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        }
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentAdminAppointmentPage > 1) {
        html += `<button onclick="changeAdminAppointmentPage(${currentAdminAppointmentPage - 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&laquo;</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentAdminAppointmentPage) {
            html += `<button style="padding: 6px 12px; border: 1px solid #0284c7; background: #0284c7; color: white; border-radius: 6px; font-weight: bold; cursor: default;">${i}</button>`;
        } else {
            html += `<button onclick="changeAdminAppointmentPage(${i})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#334155'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; color: #334155; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">${i}</button>`;
        }
    }

    if (currentAdminAppointmentPage < totalPages) {
        html += `<button onclick="changeAdminAppointmentPage(${currentAdminAppointmentPage + 1})" onmouseover="this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981';" onmouseout="this.style.background='white'; this.style.color='#475569'; this.style.borderColor='#e2e8f0';" style="padding: 6px 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #475569; font-weight: bold; transition: 0.2s;">&raquo;</button>`;
    }

    paginationContainer.innerHTML = html;
}

function changeAdminAppointmentPage(page) {
    currentAdminAppointmentPage = page;
    renderAppointmentTable();
}

async function editAdminAppointmentNote(id) {
    const app = allAdminAppointments.find(a => a.id === id);
    if (!app) return;

    // Parse triệu chứng (tách text và ảnh)
    let rawTrieuChung = app.mo_ta_trieu_chung || '';
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
            <div style="position: relative; display: inline-block; cursor: pointer;" onclick="Swal.fire({title: 'Hình ảnh chi tiết', imageUrl: '${src}', imageAlt: 'Triệu chứng', width: 'auto', showCloseButton: true, showConfirmButton: false})">
                <img src="${src}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #fcd34d; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            </div>
        `).join('');
        imageHtml = `<div style="display: flex; gap: 10px; margin-left: 20px; padding-left: 20px; border-left: 2px dashed #fcd34d; flex-wrap: wrap; justify-content: flex-end; max-width: 250px;">${imgTags}</div>`;
    }

    // Parse chẩn đoán từ ghi chú cũ
    let parsedChanDoan = '';
    let oldNote = app.ghi_chu_cua_bac_si || '';
    if (oldNote.includes("Chẩn đoán:")) {
        parsedChanDoan = oldNote.replace("Chẩn đoán:", "").split("\n\nĐơn thuốc:")[0].trim();
    } else {
        parsedChanDoan = oldNote;
    }

    // Fetch đơn thuốc hiện tại từ bảng DonThuoc
    let currentPrescriptions = [];
    let hasNewDonThuoc = false;
    try {
        const dtRes = await fetch(`${window.API_BASE}/api/don-thuoc/${id}`);
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

    // Tương thích ngược: parse từ text ghi chú cũ nếu bảng DonThuoc trống
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
                    currentPrescriptions.push({ thuocId: null, ten, donVi, soLuong, lieu, gia, isOld: true });
                }
            });
        }
    }

    // Fetch danh sách thuốc từ Database
    let danhSachThuocDB = [];
    try {
        const res = await fetch(`${window.API_BASE}/api/thuoc/active`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) danhSachThuocDB = data;

            // Map ID cho dữ liệu cũ
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
        title: `Sửa hồ sơ lịch hẹn #LK${id}`,
        html: `
            <div style="text-align: left; margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 20px;">
                <!-- Khu vực 0: Triệu chứng từ Bệnh nhân -->
                <div style="background: #fffbeb; padding: 15px; border-radius: 12px; border: 1px solid #fde68a; box-shadow: 0 2px 5px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1;">
                        <label style="font-weight: 700; color: #d97706; display: block; margin-bottom: 8px; font-size: 15px;"><i class="fa-solid fa-clipboard-user" style="color: #f59e0b;"></i> Triệu chứng của bệnh nhân:</label>
                        <div style="font-size: 14px; color: #334155; line-height: 1.6; word-break: break-word;">
                            ${textTrieuChung}
                        </div>
                    </div>
                    ${imageHtml}
                </div>

                <!-- Khu vực 1: Chẩn đoán -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 8px; font-size: 15px;"><i class="fa-solid fa-stethoscope" style="color: #0ea5e9;"></i> Chẩn đoán bệnh (*):</label>
                    <textarea id="admin_chan_doan" class="swal2-textarea" placeholder="Nhập chẩn đoán lâm sàng..." style="width: 100%; margin: 0; height: 80px; box-sizing: border-box; font-size: 14px; padding: 12px; border-radius: 8px; border-color: #cbd5e1;">${parsedChanDoan}</textarea>
                </div>
                
                <!-- Khu vực 2: Kê đơn thuốc từ Database -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                    <label style="font-weight: 700; color: #0f172a; display: block; margin-bottom: 12px; font-size: 15px;"><i class="fa-solid fa-pills" style="color: #10b981;"></i> Kê đơn thuốc:</label>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
                        <select id="admin_chon_thuoc" class="swal2-input" style="flex: 2; margin: 0; height: 42px; font-size: 13px; border-radius: 8px; border-color: #cbd5e1; padding: 0 8px;">
                            ${thuocOptionsHtml}
                        </select>
                        <input type="number" id="admin_so_luong_thuoc" class="swal2-input" value="1" min="1" max="100" placeholder="SL" style="flex: 0 0 65px; margin: 0; height: 42px; font-size: 14px; border-radius: 8px; border-color: #cbd5e1; text-align: center;">
                        <button type="button" id="admin_btn_add_thuoc" style="background: #0ea5e9; color: white; border: none; height: 42px; padding: 0 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; white-space: nowrap;"><i class="fa-solid fa-plus"></i> Thêm</button>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 15px;">
                        <input type="text" id="admin_lieu_dung" class="swal2-input" placeholder="Liều dùng (tự động điền khi chọn thuốc)" style="flex: 1; margin: 0; height: 42px; font-size: 13px; border-radius: 8px; border-color: #cbd5e1;">
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
                            <tbody id="admin_ds_thuoc_body">
                                <tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">Chưa có thuốc nào trong đơn</td></tr>
                            </tbody>
                            <tfoot id="admin_ds_thuoc_footer" style="display: none;">
                                <tr style="background: #f0fdf4;">
                                    <td colspan="3" style="padding: 10px 12px; font-weight: 700; color: #166534; text-align: right;">Tổng tiền thuốc:</td>
                                    <td style="padding: 10px 8px; font-weight: 700; color: #166534; text-align: right;" id="admin_tong_tien_thuoc">0 đ</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `,
        width: '800px',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-check"></i> Lưu thay đổi',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#f59e0b',
        didOpen: () => {
            const btnAdd = document.getElementById('admin_btn_add_thuoc');
            const tbody = document.getElementById('admin_ds_thuoc_body');
            const tfoot = document.getElementById('admin_ds_thuoc_footer');
            const selectThuoc = document.getElementById('admin_chon_thuoc');
            const inputLieu = document.getElementById('admin_lieu_dung');
            const inputSoLuong = document.getElementById('admin_so_luong_thuoc');

            // Khởi tạo Select2 cho ô chọn thuốc
            $('#admin_chon_thuoc').select2({
                dropdownParent: $('.swal2-popup'),
                width: '100%',
                placeholder: '-- Tìm và chọn thuốc --'
            });

            // Khi chọn thuốc → tự động điền liều dùng mặc định
            $('#admin_chon_thuoc').on('change', function () {
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
                            <button type="button" style="background: #fee2e2; border: none; color: #ef4444; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; transition: 0.2s;" onclick="window._adminRemoveThuoc(${idx})" onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>`;
                }).join('');
                document.getElementById('admin_tong_tien_thuoc').textContent = Number(tinhTongTien()).toLocaleString('vi-VN') + ' đ';
            };

            // Xóa thuốc khỏi đơn
            window._adminRemoveThuoc = (index) => {
                currentPrescriptions.splice(index, 1);
                renderThuoc();
            };

            // Render đơn thuốc hiện có
            renderThuoc();

            // Thêm thuốc mới
            btnAdd.addEventListener('click', () => {
                const selectedOption = $('#admin_chon_thuoc').find('option:selected')[0];
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

                $('#admin_chon_thuoc').val('').trigger('change');
                inputLieu.value = '';
                inputSoLuong.value = 1;
                $('#admin_chon_thuoc').select2('open');
                renderThuoc();
            });
        },
        preConfirm: () => {
            const chanDoan = document.getElementById('admin_chan_doan').value.trim();
            if (!chanDoan) {
                Swal.showValidationMessage('Vui lòng nhập Chẩn đoán bệnh!');
                return false;
            }

            // Kiểm tra thuốc cũ không map được ID
            const invalidPrescriptions = currentPrescriptions.filter(p => !p.thuocId);
            if (invalidPrescriptions.length > 0) {
                const invalidNames = invalidPrescriptions.map(p => p.ten).join(', ');
                Swal.showValidationMessage(`Thuốc cũ: "${invalidNames}" không khớp CSDL. Vui lòng xóa và chọn lại!`);
                return false;
            }

            let ghiChu = `Chẩn đoán: ${chanDoan}`;
            return { ghi_chu: ghiChu, prescriptions: currentPrescriptions };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // 1. Lưu chẩn đoán vào LichKham
                const res = await fetch(`${window.API_BASE}/api/appointments/${id}/note`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ghi_chu_cua_bac_si: result.value.ghi_chu })
                });

                if (res.ok) {
                    // 2. Lưu đơn thuốc vào bảng DonThuoc
                    if (result.value.prescriptions && result.value.prescriptions.length > 0) {
                        const danhSachThuoc = result.value.prescriptions.map(t => ({
                            thuoc_id: t.thuocId,
                            so_luong: t.soLuong,
                            lieu_dung: t.lieu,
                            ghi_chu: ''
                        }));

                        // Luôn dùng PUT để cập nhật (upsert)
                        await fetch(`${window.API_BASE}/api/don-thuoc/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ danh_sach_thuoc: danhSachThuoc })
                        });
                    } else {
                        // Nếu xóa hết thuốc → xóa đơn thuốc cũ
                        await fetch(`${window.API_BASE}/api/don-thuoc/${id}`, { method: 'DELETE' });
                    }

                    Swal.fire('Thành công!', 'Ghi chú và đơn thuốc đã được cập nhật!', 'success');
                    fetchAdminAppointments();
                } else {
                    const data = await res.json();
                    Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra!', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error');
            }
        }
    });
}

function deleteAdminAppointment(id) {
    Swal.fire({
        title: 'Xác nhận hủy lịch',
        text: `Bạn có chắc chắn muốn hủy lịch hẹn #LK${id} không?`,
        icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#9ca3af', confirmButtonText: 'Đồng ý hủy', cancelButtonText: 'Bỏ qua'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${window.API_BASE}/api/appointments/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) { Swal.fire('Thành công!', data.message || 'Hủy lịch hẹn thành công!', 'success'); fetchAdminAppointments(); }
                else { Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra khi hủy lịch hẹn!', 'error'); }
            } catch (error) { console.error('Lỗi API Hủy:', error); Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error'); }
        }
    });
}

// Gọi API ngay khi tải trang
fetchAdminAppointments();