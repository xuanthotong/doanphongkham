const appointmentTbody = document.getElementById('appointmentTableBody');
let allAdminAppointments = [];
let currentAdminAppointmentPage = 1;
const adminAppointmentItemsPerPage = 10;

async function fetchAdminAppointments() {
    if (!appointmentTbody) return;
    try {
        const response = await fetch('https://doanphongkham.onrender.com/api/appointments');
        allAdminAppointments = await response.json();
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
    const filterStatus = statusInput ? statusInput.value.toLowerCase() : '';

    if (window.lastAdminAppointmentKeyword !== keyword || window.lastAdminAppDate !== filterDate || window.lastAdminAppStatus !== filterStatus) {
        currentAdminAppointmentPage = 1;
        window.lastAdminAppointmentKeyword = keyword;
        window.lastAdminAppDate = filterDate;
        window.lastAdminAppStatus = filterStatus;
    }

    let filteredList = allAdminAppointments;

    if (filterDate) {
        filteredList = filteredList.filter(app => {
            if (!app.ngay_lam_viec) return false;
            const dKham = new Date(app.ngay_lam_viec);
            const appDateStr = `${dKham.getFullYear()}-${String(dKham.getMonth() + 1).padStart(2, '0')}-${String(dKham.getDate()).padStart(2, '0')}`;
            return appDateStr === filterDate;
        });
    }

    if (filterStatus) {
        filteredList = filteredList.filter(app => {
            const status = app.trang_thai ? app.trang_thai.trim().toLowerCase() : '';
            return status === filterStatus;
        });
    }

    if (keyword) {
        filteredList = filteredList.filter(app => 
            (app.ten_benh_nhan && app.ten_benh_nhan.toLowerCase().includes(keyword)) || 
            `lk${app.id}`.includes(keyword) || 
            (app.so_dien_thoai && app.so_dien_thoai.includes(keyword)) ||
            (app.ten_bac_si && app.ten_bac_si.toLowerCase().includes(keyword))
        );
    }

    if (filteredList.length === 0) {
        appointmentTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy lịch hẹn phù hợp.</td></tr>`;
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
            <td><strong>#LK${app.id}</strong></td>
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

function editAdminAppointmentNote(id) {
    const app = allAdminAppointments.find(a => a.id === id);
    if (!app) return;

    Swal.fire({
        title: `Sửa ghi chú lịch hẹn #LK${id}`,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Ghi chú của Bác sĩ / Đơn thuốc:</label>
                <textarea id="admin_edit_note" class="swal2-textarea" style="width: 90%; height: 150px; margin: 0;">${app.ghi_chu_cua_bac_si || ''}</textarea>
            </div>
        `,
        width: '600px', showCancelButton: true, confirmButtonText: 'Cập nhật', cancelButtonText: 'Hủy', confirmButtonColor: '#f59e0b',
        preConfirm: () => {
            return document.getElementById('admin_edit_note').value;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`https://doanphongkham.onrender.com/api/appointments/${id}/note`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ghi_chu_cua_bac_si: result.value })
                });
                const data = await res.json();
                if (res.ok) { Swal.fire('Thành công!', 'Cập nhật ghi chú thành công!', 'success'); fetchAdminAppointments(); } 
                else { Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra!', 'error'); }
            } catch (error) { console.error(error); Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error'); }
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
                const response = await fetch(`https://doanphongkham.onrender.com/api/appointments/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) { Swal.fire('Thành công!', data.message || 'Hủy lịch hẹn thành công!', 'success'); fetchAdminAppointments(); } 
                else { Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra khi hủy lịch hẹn!', 'error'); }
            } catch (error) { console.error('Lỗi API Hủy:', error); Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error'); }
        }
    });
}

// Gọi API ngay khi tải trang
fetchAdminAppointments();