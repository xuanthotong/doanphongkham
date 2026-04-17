const accountTbody = document.getElementById('accountTableBody');

async function fetchAccounts() {
    // Nếu trang hiện tại không có bảng Tài khoản thì bỏ qua, tránh báo lỗi
    if (!accountTbody) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/accounts');
        const accounts = await response.json();
        renderAccountTable(accounts);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu tài khoản:', error);
    }
}

function renderAccountTable(accounts) {
    if (!accountTbody) return;
    accountTbody.innerHTML = '';
    
    if (accounts.length === 0) {
        accountTbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu tài khoản.</td></tr>`;
        return;
    }

    accounts.forEach((acc) => {
        const genderText = acc.gioi_tinh == 1 ? "Nam" : (acc.gioi_tinh == 0 ? "Nữ" : "Chưa cập nhật");
        const statusBadge = acc.trang_thai == 1 ? 
            `<span class="badge" style="background-color: #dcfce7; color: #166534;">Hoạt động</span>` : 
            `<span class="badge" style="background-color: #fee2e2; color: #991b1b;">Đã khóa</span>`;

        // Render ảnh mặc định nếu chưa có
        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.ho_ten || acc.ten_dang_nhap)}&background=random`;
        const imgSrc = acc.anh_dai_dien && acc.anh_dai_dien.trim() !== "" ? acc.anh_dai_dien : defaultImg;
        
        // Màu nhãn dán tùy theo vai trò
        const roleBadgeColor = acc.ten_vai_tro === 'Admin' ? 'background: #fef08a; color: #92400e;' : (acc.ten_vai_tro === 'BacSi' ? 'background: #bae6fd; color: #075985;' : 'background: #e0e7ff; color: #4338ca;');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${imgSrc}" onerror="this.onerror=null; this.src='${defaultImg}';" width="40" height="40" style="border-radius:50%; object-fit: cover; border: 1px solid #ddd;"></td>
            <td>${acc.id}</td>
            <td style="font-weight: 600;">${acc.ten_dang_nhap}</td>
            <td>********</td>
            <td>${acc.ho_ten || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${acc.ngay_sinh ? new Date(acc.ngay_sinh).toLocaleDateString('vi-VN') : '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${genderText}</td>
            <td>${acc.so_dien_thoai || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td>${acc.email}</td>
            <td>${acc.dia_chi || '<span style="color: #9ca3af;">Chưa cập nhật</span>'}</td>
            <td><span class="badge" style="${roleBadgeColor}">${acc.ten_vai_tro}</span></td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="alert('Chức năng sửa đang phát triển')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="alert('Chức năng xóa đang phát triển')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        accountTbody.appendChild(tr);
    });
}

// Gọi API ngay khi tải trang
fetchAccounts();