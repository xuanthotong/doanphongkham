let posts = [];
let categoriesList = []; // Mảng chứa danh mục để tra cứu

// 2. Khai báo các biến DOM
const postTbody = document.getElementById('postTableBody');
const postForm = document.getElementById('postForm');
const postModalTitle = document.getElementById('postModalTitle');

// Hàm lấy tên danh mục từ ID
function getCategoryName(id) {
    const cat = categoriesList.find(c => c.id == id);
    return cat ? cat.ten_danh_muc : "Khác";
}

// Chuyển đổi Ngày từ YYYY-MM-DD sang DD/MM/YYYY
function formatDatePost(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// =========================================================
// HÀM HIỂN THỊ DỮ LIỆU RA BẢNG
// =========================================================
function renderPostTable() {
    if (!postTbody) return;
    postTbody.innerHTML = '';
    
    if (posts.length === 0) {
        postTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có bài viết nào.</td></tr>`;
        return;
    }

    posts.forEach((p) => {
        // Xử lý ảnh mặc định nếu không có ảnh hoặc ảnh bị lỗi
        const defaultImg = "https://placehold.co/80x50?text=No+Image";
        const imgSrc = p.anh_thu_nho && p.anh_thu_nho.trim() !== "" ? p.anh_thu_nho : defaultImg;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${imgSrc}" 
                     onerror="this.onerror=null; this.src='${defaultImg}';" 
                     width="80" 
                     height="50"
                     style="border-radius: 4px; object-fit: cover; border: 1px solid #ddd;">
            </td>
            <td style="font-weight: 600; white-space: normal; max-width: 250px;">${p.tieu_de}</td>
            <td style="white-space: normal; max-width: 300px; color: #6b7280; font-size: 13px;">${(p.noi_dung || '').substring(0, 50)}...</td>
            <td>${getCategoryName(p.danh_muc_id)}</td>
            <td><span class="badge" style="background: #fef08a; color: #92400e;">${p.tac_gia || 'Admin'}</span></td>
            <td>${formatDatePost(p.ngay_xuat_ban)}</td>
            <td>
                <button class="action-btn edit" onclick="editPost(${p.id})" title="Sửa bài viết"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete" onclick="deletePost(${p.id})" title="Xóa bài viết"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        postTbody.appendChild(tr);
    });
}

// =========================================================
// HÀM MỞ / ĐÓNG / SỬA / XÓA MODAL
// =========================================================
function openPostModal() {
    if(postForm) postForm.reset();
    document.getElementById('p_id').value = '';
    document.getElementById('p_anh_file').value = ''; // Reset input file ảnh
    
    postModalTitle.innerText = 'Đăng bài viết mới';
    
    // Gán mặc định Tác giả và Ngày hôm nay
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    document.getElementById('p_tac_gia').value = userInfo.username || "Admin";
    
    document.getElementById('p_ngay_xuat_ban').value = new Date().toISOString().split('T')[0]; 

    document.getElementById('postModal').style.display = 'flex';
}

function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
}

function editPost(id) {
    const p = posts.find(item => item.id === id);
    if(!p) return;

    // Đổ dữ liệu cũ vào Form
    document.getElementById('p_id').value = p.id;
    document.getElementById('p_tieu_de').value = p.tieu_de;
    document.getElementById('p_danh_muc').value = p.danh_muc_id;
    
    // Đổ link ảnh cũ vào ô input text (nếu có)
    document.getElementById('p_anh_thu_nho').value = (p.anh_thu_nho && p.anh_thu_nho.startsWith('data:image')) ? '' : p.anh_thu_nho; 
    document.getElementById('p_anh_file').value = ''; // Reset input file
    
    document.getElementById('p_tac_gia').value = p.tac_gia || "Admin";
    document.getElementById('p_ngay_xuat_ban').value = p.ngay_xuat_ban ? new Date(p.ngay_xuat_ban).toISOString().split('T')[0] : '';
    document.getElementById('p_noi_dung').value = p.noi_dung;

    postModalTitle.innerText = 'Sửa bài viết';
    document.getElementById('postModal').style.display = 'flex';
}

async function deletePost(id) {
    Swal.fire({
        title: 'Xác nhận xóa',
        text: "Bạn có chắc chắn muốn xóa bài viết này không?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('http://localhost:3000/api/posts/' + id, { method: 'DELETE' });
                if(res.ok) {
                    Swal.fire('Đã xóa!', 'Xóa bài viết thành công.', 'success');
                    fetchPosts();
                } else {
                    Swal.fire('Lỗi!', 'Lỗi khi xóa bài viết!', 'error');
                }
            } catch(err) { Swal.fire('Lỗi!', 'Không thể kết nối Backend', 'error'); }
        }
    });
}

// =========================================================
// XỬ LÝ LƯU DỮ LIỆU KHI SUBMIT FORM (UPLOAD ẢNH BASE64 / LINK)
// =========================================================

async function fetchPosts() {
    try {
        const response = await fetch('http://localhost:3000/api/posts');
        posts = await response.json();
        renderPostTable();
    } catch (error) { console.error('Lỗi khi lấy dữ liệu bài viết:', error); }
}

if (postForm) {
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('p_anh_file');
        const linkInput = document.getElementById('p_anh_thu_nho').value;

        // Hàm nội bộ: Gom dữ liệu và lưu vào mảng
        const savePostData = async (finalImageUrl) => {
            const idValue = document.getElementById('p_id').value;
            
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const newPost = {
                tieu_de: document.getElementById('p_tieu_de').value,
                danh_muc_id: parseInt(document.getElementById('p_danh_muc').value),
                anh_thu_nho: finalImageUrl, 
                tac_gia_id: userInfo.id || 1, // Lấy chuẩn ID của người đang đăng nhập
                ngay_xuat_ban: document.getElementById('p_ngay_xuat_ban').value,
                noi_dung: document.getElementById('p_noi_dung').value
            };

            if (idValue) {
                const idx = posts.findIndex(p => p.id == idValue);
                if (idx !== -1 && (!finalImageUrl || finalImageUrl.trim() === "")) {
                    newPost.anh_thu_nho = posts[idx].anh_thu_nho; 
                }
                
                try {
                    const res = await fetch('http://localhost:3000/api/posts/' + idValue, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newPost)
                    });
                    if(res.ok) { 
                        Swal.fire('Thành công!', "Cập nhật thành công!", 'success'); fetchPosts(); closePostModal(); 
                    } else {
                        const data = await res.json();
                        Swal.fire('Lỗi!', data.message || "Lỗi khi cập nhật bài viết!", 'error');
                    }
                } catch(err) { Swal.fire('Lỗi!', "Lỗi kết nối", 'error'); }
            } else {
                try {
                    const res = await fetch('http://localhost:3000/api/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newPost)
                    });
                    if(res.ok) { 
                        Swal.fire('Thành công!', "Đăng bài thành công!", 'success'); fetchPosts(); closePostModal(); 
                    } else {
                        const data = await res.json();
                        Swal.fire('Lỗi!', data.message || "Lỗi khi đăng bài viết!", 'error');
                    }
                } catch(err) { Swal.fire('Lỗi!', "Lỗi kết nối", 'error'); }
            }
        };

        // KIỂM TRA: Ưu tiên lấy file từ máy tính trước
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // Mã hóa ảnh thành chuỗi Base64
                savePostData(event.target.result); 
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            // Nếu không chọn file -> Lấy dữ liệu từ ô nhập Link
            savePostData(linkInput);
        }
    });
}
// GỌI API LẤY DANH SÁCH DANH MỤC CHO DROPDOWN BÀI VIẾT
async function fetchCategoriesForDropdown() {
    const danhMucSelect = document.getElementById('p_danh_muc');
    try {
        const response = await fetch('http://localhost:3000/api/categories');
        categoriesList = await response.json();
        
        if (danhMucSelect) {
            danhMucSelect.innerHTML = '<option value="" disabled selected>-- Chọn danh mục --</option>';
            categoriesList.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.ten_danh_muc;
                danhMucSelect.appendChild(option);
            });
        }
        
        renderPostTable(); // Render lại bảng bài viết để cập nhật tên danh mục
    } catch (error) { console.error('Lỗi khi lấy dữ liệu danh mục:', error); }
}

// Gọi hàm này ngay khi file post.js chạy
fetchCategoriesForDropdown();

// Khởi chạy lần đầu để hiển thị bảng
fetchPosts();