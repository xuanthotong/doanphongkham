let accounts = []; 
const accountTbody = document.getElementById('accountTableBody');

// Hàm chuyển đổi Ngày từ YYYY-MM-DD sang DD/MM/YYYY
function formatDateAccount(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// HÀM LẤY DỮ LIỆU TỪ CƠ SỞ DỮ LIỆU (CHUẨN BỊ CHO TƯƠNG LAI)
async function fetchAccounts() {
    try {
        // [TƯƠNG LAI]: Khi có Backend Node.js, bạn MỞ COMMENT 2 dòng dưới đây
        // const response = await fetch('http://localhost:3000/api/patients');
        // accounts = await response.json();

        // [HIỆN TẠI]: Dữ liệu giả lập để thiết kế giao diện (Sau này XÓA đoạn này đi)
        accounts = [
            { id: 1, anh: "", ten_dang_nhap: "benhnhanA", mat_khau: "***", ho_ten: "Nguyễn Văn A", ngay_sinh: "1995-10-15", gioi_tinh: 1, sdt: "0123456789", email: "nva@gmail.com", dia_chi: "Hải Dương", vai_tro: "Bệnh nhân", trang_thai: 1 },
            { id: 2, anh: "", ten_dang_nhap: "benhnhanB", mat_khau: "***", ho_ten: "Trần Thị B", ngay_sinh: "1998-02-20", gioi_tinh: 0, sdt: "0987654321", email: "ttb@gmail.com", dia_chi: "Hà Nội", vai_tro: "Bệnh nhân", trang_thai: 1 }
        ];

        renderAccountTable(); // Lấy xong dữ liệu thì gọi hàm vẽ bảng
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu người dùng:", error);
    }
}

function renderAccountTable() {
    if (!accountTbody) return;
    accountTbody.innerHTML = '';
    
    if (accounts.length === 0) {
        accountTbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có bệnh nhân nào đăng ký.</td></tr>`;
        return;
    }

    accounts.forEach((acc) => {
        const genderText = acc.gioi_tinh == 1 ? "Nam" : "Nữ";
        const statusBadge = acc.trang_thai == 1 ? `<span class="badge" style="background-color: #dcfce7; color: #166534;">Hoạt động</span>` : `<span class="badge" style="background-color: #fee2e2; color: #991b1b;">Đã khóa</span>`;
        const actionIcon = acc.trang_thai == 1 ? `<i class="fa-solid fa-lock" style="color: #ef4444;"></i>` : `<i class="fa-solid fa-lock-open" style="color: #10b981;"></i>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${acc.anh || 'https://ui-avatars.com/api/?name='+acc.ho_ten+'&background=random'}" width="40" height="40" style="border-radius:50%; object-fit: cover;"></td>
            <td>${acc.id}</td>
            <td style="font-weight: 600;">${acc.ten_dang_nhap}</td>
            <td>${acc.mat_khau}</td>
            <td>${acc.ho_ten}</td>
            <td>${formatDateAccount(acc.ngay_sinh)}</td>
            <td>${genderText}</td>
            <td>${acc.sdt}</td>
            <td>${acc.email}</td>
            <td>${acc.dia_chi}</td>
            <td><span class="badge" style="background-color: #e0e7ff; color: #4338ca;">${acc.vai_tro}</span></td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="toggleAccountStatus(${acc.id})" title="Khóa/Mở khóa">${actionIcon}</button>
            </td>
        `;
        accountTbody.appendChild(tr);
    });
}

// [TƯƠNG LAI]: Hàm này sẽ gọi API PUT/PATCH để sửa trạng thái trên SQL
async function toggleAccountStatus(id) {
    const acc = accounts.find(a => a.id === id);
    if (acc) {
        if(confirm(`Bạn muốn ${acc.trang_thai == 1 ? 'Khóa' : 'Mở khóa'} tài khoản này?`)) {
            // VD API sau này: await fetch(`/api/patients/${id}/status`, { method: 'PUT' });
            acc.trang_thai = acc.trang_thai === 1 ? 0 : 1; 
            renderAccountTable();
        }
    }
}

// Chạy hàm lấy dữ liệu khi load trang
fetchAccounts();