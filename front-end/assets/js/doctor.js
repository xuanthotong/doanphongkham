// Khởi tạo mảng rỗng
let doctors = [];

const tbody = document.getElementById('doctorTableBody');
const modal = document.getElementById('doctorModal');
const form = document.getElementById('doctorForm');
const modalTitle = document.getElementById('modalTitle');
const chuyenKhoaSelect = document.getElementById('d_chuyen_khoa');

// =======================================================
// TỰ ĐỘNG THÊM DẤU PHẨY KHI GÕ TIỀN VÀO Ô PHÍ KHÁM
// =======================================================
const phiKhamInput = document.getElementById('d_phi_kham');
if (phiKhamInput) {
    phiKhamInput.addEventListener('input', function(e) {
        // Loại bỏ mọi ký tự không phải là số (để tránh lỗi)
        let value = this.value.replace(/\D/g, '');
        // Nếu có giá trị thì format thêm dấu phẩy
        if (value !== '') {
            this.value = Number(value).toLocaleString('en-US');
        } else {
            this.value = '';
        }
    });
}

// Format hiển thị số tiền VND ngoài bảng
function formatCurrency(amount) {
    if (!amount) return "0 VNĐ";
    return Number(amount).toLocaleString('en-US') + ' VNĐ';
}

// Format hiển thị ngày sinh (Từ YYYY-MM-DD sang DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// =======================================================
// HÀM RENDER DỮ LIỆU RA BẢNG
// =======================================================
function renderTable() {
    tbody.innerHTML = '';
    
    if (doctors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dữ liệu bác sĩ nào. Vui lòng thêm mới.</td></tr>`;
        return;
    }

    doctors.forEach((doc) => {
        const genderText = doc.gioi_tinh == 1 ? "Nam" : "Nữ";
        const statusBadge = doc.trang_thai == 1 ? 
            `<span class="badge" style="background-color: #dcfce7; color: #166534;">Hoạt động</span>` : 
            `<span class="badge" style="background-color: #fee2e2; color: #991b1b;">Đã khóa</span>`;

        // Xử lý ảnh mặc định (Lấy tên viết tắt làm Avatar) và Bắt lỗi rách ảnh
        const defaultImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.ho_ten)}&background=random`;
        const imgSrc = doc.anh_dai_dien && doc.anh_dai_dien.trim() !== "" ? doc.anh_dai_dien : defaultImg;

        const tr = document.createElement('tr');
        // Cập nhật đầy đủ 14 cột tương ứng với thead
        tr.innerHTML = `
            <td>
                <img src="${imgSrc}" 
                     onerror="this.onerror=null; this.src='${defaultImg}';" 
                     width="40" height="40" 
                     style="border-radius:50%; object-fit: cover; border: 1px solid #ddd;">
            </td>
            <td class="doctor-name" style="font-weight: 600;">${doc.ho_ten}</td>
            <td>${formatDate(doc.ngay_sinh)}</td>
            <td>${genderText}</td>
            <td>${doc.so_dien_thoai}</td>
            <td>${doc.email}</td>
            <td>${doc.dia_chi}</td>
            <td><span class="badge" style="background: #e0f2fe; color: #0369a1;">${doc.ten_chuyen_khoa || 'Chưa cập nhật'}</span></td>
            <td>${doc.nam_kinh_nghiem} năm</td>
            <td style="color: #ef4444; font-weight: 600;">${formatCurrency(doc.phi_kham)}</td>
            <td>${doc.ten_dang_nhap}</td>
            <td>********</td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn edit" onclick="editDoctor(${doc.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deleteDoctor(${doc.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddModal() {
    form.reset();
    document.getElementById('d_id').value = '';
    // Đặt lại chữ mờ hướng dẫn cho ô Mật khẩu
    document.getElementById('d_mat_khau').placeholder = 'Nhập mật khẩu mới';
    
    // Reset ô chọn file ảnh
    const fileInput = document.getElementById('d_anh_file');
    if (fileInput) fileInput.value = '';

    modalTitle.innerText = 'Thêm mới Bác sĩ';
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

function editDoctor(id) {
    const doc = doctors.find(d => d.id === id);
    if (!doc) return;

    document.getElementById('d_id').value = doc.id;
    document.getElementById('d_ten_dang_nhap').value = doc.ten_dang_nhap;
    
    // Làm trống ô mật khẩu để Admin biết. Nếu nhập mới thì sẽ đổi mật khẩu.
    document.getElementById('d_mat_khau').value = ''; 
    document.getElementById('d_mat_khau').placeholder = 'Để trống nếu không đổi mật khẩu';
    
    document.getElementById('d_email').value = doc.email;
    
    document.getElementById('d_ho_ten').value = doc.ho_ten;
    document.getElementById('d_ngay_sinh').value = doc.ngay_sinh;
    document.getElementById('d_gioi_tinh').value = doc.gioi_tinh;
    document.getElementById('d_so_dien_thoai').value = doc.so_dien_thoai;
    document.getElementById('d_dia_chi').value = doc.dia_chi;
    
    if (document.getElementById('d_chuyen_khoa')) {
        document.getElementById('d_chuyen_khoa').value = doc.chuyen_khoa_id || '';
    }
    document.getElementById('d_nam_kinh_nghiem').value = doc.nam_kinh_nghiem;
    
    // Khi mở form sửa, cũng format lại tiền có dấu phẩy
    document.getElementById('d_phi_kham').value = doc.phi_kham ? Number(doc.phi_kham).toLocaleString('en-US') : '';
    
    // Xử lý ảnh: Nếu ảnh cũ là upload từ máy (Base64) thì để trống ô Link, đồng thời reset ô chọn File
    const fileInput = document.getElementById('d_anh_file');
    if (fileInput) fileInput.value = '';
    
    const linkInput = document.getElementById('d_anh_dai_dien');
    if (linkInput) {
        linkInput.value = (doc.anh_dai_dien && doc.anh_dai_dien.startsWith('data:image')) ? '' : doc.anh_dai_dien;
    }
    
    document.getElementById('d_tieu_su').value = doc.tieu_su;

    modalTitle.innerText = 'Sửa thông tin Bác sĩ';
    modal.style.display = 'flex';
}

async function deleteDoctor(id) {
    if (confirm("Bạn có chắc chắn muốn xóa Bác sĩ này không?")) {
        try {
            const res = await fetch('http://localhost:3000/api/doctors/' + id, { method: 'DELETE' });
            const data = await res.json();
            if(res.ok) {
                alert("Xóa Bác sĩ thành công!");
                fetchDoctors(); // Tải lại bảng từ SQL
            } else {
                alert(data.message || "Lỗi khi xóa!");
            }
        } catch(err) { console.error(err); alert("Không thể kết nối Backend"); }
    }
}

// =======================================================
// GỌI API LẤY DANH SÁCH BÁC SĨ (TỪ SQL SERVER)
// =======================================================
async function fetchDoctors() {
    try {
        const response = await fetch('http://localhost:3000/api/doctors');
        doctors = await response.json(); // Cập nhật mảng ảo bằng dữ liệu thật
        renderTable();
    } catch (error) { console.error('Lỗi khi lấy dữ liệu bác sĩ:', error); }
}

// =========================================================
// XỬ LÝ LƯU DỮ LIỆU KHI SUBMIT (Ưu tiên File Upload)
// =========================================================
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('d_anh_file');
    const linkInput = document.getElementById('d_anh_dai_dien');
    const linkValue = linkInput ? linkInput.value : '';

    // Hàm lưu dữ liệu gọi API Post/Put
    const saveDoctorData = async (finalImageUrl) => {
        const idValue = document.getElementById('d_id').value;
        // Lấy giá trị tiền và TÁCH DẤU PHẨY RA trước khi lưu vào mảng
        let rawPhiKham = document.getElementById('d_phi_kham').value.replace(/,/g, '');

        const ckVal = document.getElementById('d_chuyen_khoa') ? document.getElementById('d_chuyen_khoa').value : '';

        const newDoc = {
            ten_dang_nhap: document.getElementById('d_ten_dang_nhap').value,
            mat_khau: document.getElementById('d_mat_khau').value,
            email: document.getElementById('d_email').value,
            trang_thai: 1, 
            ho_ten: document.getElementById('d_ho_ten').value,
            ngay_sinh: document.getElementById('d_ngay_sinh').value,
            gioi_tinh: parseInt(document.getElementById('d_gioi_tinh').value), 
            so_dien_thoai: document.getElementById('d_so_dien_thoai').value,
            dia_chi: document.getElementById('d_dia_chi').value,
            anh_dai_dien: finalImageUrl, // Lưu ảnh từ máy hoặc link
            chuyen_khoa_id: ckVal ? parseInt(ckVal) : null,
            nam_kinh_nghiem: parseInt(document.getElementById('d_nam_kinh_nghiem').value),
            phi_kham: parseFloat(rawPhiKham),
            tieu_su: document.getElementById('d_tieu_su').value
        };

        if (idValue) {
            // Giữ lại ảnh cũ nếu Admin đang sửa nhưng không chọn ảnh mới
            const index = doctors.findIndex(d => d.id == idValue);
            if (index !== -1 && (!finalImageUrl || finalImageUrl.trim() === '')) {
                newDoc.anh_dai_dien = doctors[index].anh_dai_dien;
            }

            try {
                // GỌI API SỬA (PUT) VÀO CƠ SỞ DỮ LIỆU
                const res = await fetch('http://localhost:3000/api/doctors/' + idValue, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newDoc)
                });
                if(res.ok) {
                    alert("Cập nhật thông tin thành công!");
                    fetchDoctors(); // Load lại bảng
                    closeModal();
                } else {
                    const data = await res.json();
                    alert(data.message || "Lỗi khi sửa Bác sĩ!");
                }
            } catch(err) { console.error(err); alert("Không thể kết nối Backend"); }
        } else {
            try {
                // GỌI API THÊM MỚI (POST) VÀO CƠ SỞ DỮ LIỆU
                const res = await fetch('http://localhost:3000/api/doctors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newDoc)
                });
                if(res.ok) {
                    alert("Thêm Bác sĩ thành công!");
                    fetchDoctors(); // Load lại bảng sau khi thêm
                    closeModal();
                } else {
                    const data = await res.json();
                    alert(data.message || "Lỗi khi thêm Bác sĩ!");
                }
            } catch(err) { console.error(err); alert("Không thể kết nối Backend"); }
        }
    };

    // KIỂM TRA: Ưu tiên lấy file từ máy tính trước
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            saveDoctorData(event.target.result); // Base64 của ảnh
        };
        reader.readAsDataURL(fileInput.files[0]); // Bắt đầu đọc file ảnh
    } else {
        // Không chọn file thì lấy link văn bản
        saveDoctorData(linkValue);
    }
});

// Gọi dữ liệu khi mở trang thay vì gọi bảng trống
fetchDoctors();