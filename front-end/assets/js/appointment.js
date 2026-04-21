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

// Bạn có thể thêm <input id="searchAdminAppointment" oninput="renderAppointmentTable()"> vào HTML của Admin để dùng tính năng này
function renderAppointmentTable() {
    const tbody = document.getElementById('appointmentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Lấy từ khóa tìm kiếm (nếu Admin có ô tìm kiếm)
    const searchInput = document.getElementById('searchAdminAppointment');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredList = [...allAppointments];

    // Thuật toán lọc theo Từ khóa (Tên bệnh nhân, Mã lịch khám, SĐT, Tên bác sĩ)
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
        if (status === 'pending') {
            statusHtml = `<span class="badge" style="background:#fef3c7; color:#d97706;">Chờ duyệt</span>`;
        } else if (status === 'approved') {
            statusHtml = `<span class="badge" style="background:#dcfce7; color:#166534;">Đã duyệt</span>`;
        } else if (status === 'done') {
            statusHtml = `<span class="badge" style="background:#f3f4f6; color:#4b5563;">Đã khám xong</span>`;
        } else if (status === 'cancelled') {
            statusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;">Đã hủy</span>`;
        }

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

// Tự động tải dữ liệu khi vào trang
document.addEventListener('DOMContentLoaded', fetchAllAppointments);