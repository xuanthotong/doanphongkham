let appointments = []; 
const apptTbody = document.getElementById('appointmentTableBody');

// HÀM LẤY DỮ LIỆU TỪ CƠ SỞ DỮ LIỆU
async function fetchAppointments() {
    try {
        // [TƯƠNG LAI]: Mở comment để fetch API lấy danh sách lịch hẹn từ SQL
        // const response = await fetch('http://localhost:3000/api/appointments');
        // appointments = await response.json();

        // [HIỆN TẠI]: Dữ liệu giả lập (Sau này XÓA đoạn này đi)
        appointments = [
            { id: 1, ma_lh: "#LK001", benh_nhan: "Nguyễn Văn A", bac_si: "BS. Trần Thị Thúy Hằng", ngay_kham: "20/04/2026", khung_gio: "08:00 - 09:00", trieu_chung: "Đau rát họng", ghi_chu: "", ngay_dat: "16/04/2026", trang_thai: "Pending" }
        ];
        renderApptTable();
    } catch (error) {
        console.error("Lỗi lấy lịch hẹn:", error);
    }
}

function renderApptTable() {
    if (!apptTbody) return;
    apptTbody.innerHTML = '';
    
    if (appointments.length === 0) {
        apptTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có bệnh nhân nào đặt lịch.</td></tr>`;
        return;
    }

    appointments.forEach((apt) => {
        let statusBadge = "";
        if(apt.trang_thai === "Pending") statusBadge = `<span class="badge" style="background-color: #fef08a; color: #854d0e;"><i class="fa-solid fa-clock"></i> Chờ duyệt</span>`;
        else if(apt.trang_thai === "Approved") statusBadge = `<span class="badge" style="background-color: #dcfce7; color: #166534;"><i class="fa-solid fa-check"></i> Đã duyệt</span>`;
        else statusBadge = `<span class="badge" style="background-color: #fee2e2; color: #991b1b;"><i class="fa-solid fa-xmark"></i> Đã hủy</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: var(--primary-color);">${apt.ma_lh}</td>
            <td style="font-weight: 600;">${apt.benh_nhan}</td>
            <td>${apt.bac_si}</td>
            <td>${apt.ngay_kham}</td>
            <td>${apt.khung_gio}</td>
            <td style="white-space: normal; max-width: 200px;">${apt.trieu_chung}</td>
            <td style="white-space: normal; max-width: 200px;">${apt.ghi_chu}</td>
            <td>${apt.ngay_dat}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="updateApptStatus(${apt.id}, 'Approved')" title="Duyệt lịch"><i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 20px;"></i></button>
                <button class="action-btn delete" onclick="updateApptStatus(${apt.id}, 'Cancelled')" title="Hủy lịch"><i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 20px;"></i></button>
            </td>
        `;
        apptTbody.appendChild(tr);
    });
}

// [TƯƠNG LAI]: Hàm gọi API update trạng thái lịch hẹn xuống DB
async function updateApptStatus(id, newStatus) {
    const apt = appointments.find(a => a.id === id);
    if(apt) {
        if(confirm(`Bạn có chắc chắn muốn ${newStatus === 'Approved' ? 'duyệt' : 'hủy'} lịch hẹn này?`)){
            // VD API: await fetch(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            apt.trang_thai = newStatus;
            renderApptTable();
        }
    }
}

fetchAppointments();