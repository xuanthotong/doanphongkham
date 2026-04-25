const appointmentTbody = document.getElementById('appointmentTableBody');
let allAdminAppointments = [];

async function fetchAdminAppointments() {
    if (!appointmentTbody) return;
    try {
        const response = await fetch('http://localhost:3000/api/appointments');
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

    let filteredList = allAdminAppointments;

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
        return;
    }

    filteredList.forEach(app => {
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

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#LK${app.id}</strong></td>
            <td><b>${app.ten_benh_nhan}</b><br><span style="color:#64748b; font-size:12px;">${app.so_dien_thoai}</span></td>
            <td>BS. ${app.ten_bac_si}</td>
            <td>${ngayKhamStr}</td>
            <td style="color:var(--primary-color); font-weight: 600;">${app.gio_kham || app.khung_gio}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${app.mo_ta_trieu_chung || ''}">${app.mo_ta_trieu_chung || '<span style="color:#9ca3af;">Không có</span>'}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${app.ghi_chu_cua_bac_si || ''}">${app.ghi_chu_cua_bac_si || '<span style="color:#9ca3af;">Không có</span>'}</td>
            <td>${ngayTaoStr}</td>
            <td>${statusHtml}</td>
            <td>
                <button class="action-btn edit" onclick="editAdminAppointmentNote(${app.id})" title="Sửa ghi chú" style="background-color: #f59e0b; margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteAdminAppointment(${app.id})" title="Xóa lịch hẹn"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        appointmentTbody.appendChild(tr);
    });
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
                const res = await fetch(`http://localhost:3000/api/appointments/${id}/note`, {
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
        title: 'Xác nhận xóa',
        text: `Bạn có chắc chắn muốn xóa lịch hẹn #LK${id} không? Hành động này không thể hoàn tác!`,
        icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#9ca3af', confirmButtonText: 'Đồng ý xóa', cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/appointments/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) { Swal.fire('Đã xóa!', 'Xóa lịch hẹn thành công!', 'success'); fetchAdminAppointments(); } 
                else { Swal.fire('Lỗi!', data.message || 'Có lỗi xảy ra khi xóa lịch hẹn!', 'error'); }
            } catch (error) { console.error('Lỗi API Xóa:', error); Swal.fire('Lỗi kết nối!', 'Không thể kết nối tới Server!', 'error'); }
        }
    });
}

// Gọi API ngay khi tải trang
fetchAdminAppointments();