
// 1. Mảng lưu trữ dữ liệu (Giả lập Database)
let posts = [
    { 
        id: 1, 
        //anh: "https://placehold.co/80x50?text=Anh+Minh+Hoa", 
        tieu_de: "Cách phòng ngừa cảm cúm giao mùa", 
        noi_dung: "Giao mùa là thời điểm cơ thể rất dễ mắc các bệnh về đường hô hấp, đặc biệt là cảm cúm. Để phòng bệnh, chúng ta cần bổ sung đầy đủ vitamin C, giữ ấm cơ thể và hạn chế tiếp xúc với người bệnh...", 
        danh_muc: "1", 
        tac_gia: "Admin", 
        ngay_xuat_ban: "2026-04-16" 
    }
];

// 2. Khai báo các biến DOM
const postTbody = document.getElementById('postTableBody');
const postForm = document.getElementById('postForm');
const postModalTitle = document.getElementById('postModalTitle');

// Hàm lấy tên danh mục từ ID
function getCategoryName(id) {
    if(id == "1") return "Y học thường thức";
    if(id == "2") return "Mẹ và bé";
    if(id == "3") return "Dinh dưỡng";
    return "Khác";
}

// Chuyển đổi Ngày từ YYYY-MM-DD sang DD/MM/YYYY
function formatDatePost(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
        const imgSrc = p.anh && p.anh.trim() !== "" ? p.anh : defaultImg;

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
            <td style="white-space: normal; max-width: 300px; color: #6b7280; font-size: 13px;">${p.noi_dung.substring(0, 50)}...</td>
            <td>${getCategoryName(p.danh_muc)}</td>
            <td>${p.tac_gia}</td>
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
    document.getElementById('p_tac_gia').value = "Admin";
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
    document.getElementById('p_danh_muc').value = p.danh_muc;
    
    // Đổ link ảnh cũ vào ô input text (nếu có)
    document.getElementById('p_anh_thu_nho').value = p.anh.startsWith('data:image') ? '' : p.anh; 
    document.getElementById('p_anh_file').value = ''; // Reset input file
    
    document.getElementById('p_tac_gia').value = p.tac_gia;
    document.getElementById('p_ngay_xuat_ban').value = p.ngay_xuat_ban;
    document.getElementById('p_noi_dung').value = p.noi_dung;

    postModalTitle.innerText = 'Sửa bài viết';
    document.getElementById('postModal').style.display = 'flex';
}

function deletePost(id) {
    if(confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
        posts = posts.filter(p => p.id !== id);
        renderPostTable();
    }
}

// =========================================================
// XỬ LÝ LƯU DỮ LIỆU KHI SUBMIT FORM (UPLOAD ẢNH BASE64 / LINK)
// =========================================================
if (postForm) {
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('p_anh_file');
        const linkInput = document.getElementById('p_anh_thu_nho').value;

        // Hàm nội bộ: Gom dữ liệu và lưu vào mảng
        const savePostData = (finalImageUrl) => {
            const idValue = document.getElementById('p_id').value;
            
            const newPost = {
                tieu_de: document.getElementById('p_tieu_de').value,
                danh_muc: document.getElementById('p_danh_muc').value,
                anh: finalImageUrl, 
                tac_gia: document.getElementById('p_tac_gia').value,
                ngay_xuat_ban: document.getElementById('p_ngay_xuat_ban').value,
                noi_dung: document.getElementById('p_noi_dung').value
            };

            if (idValue) {
                // TRƯỜNG HỢP SỬA (UPDATE)
                const idx = posts.findIndex(p => p.id == idValue);
                // Nếu sửa mà không nhập ảnh mới -> Giữ nguyên ảnh cũ
                if (!finalImageUrl || finalImageUrl.trim() === "") {
                    newPost.anh = posts[idx].anh; 
                }
                posts[idx] = { ...posts[idx], ...newPost };
            } else {
                // TRƯỜNG HỢP THÊM MỚI (CREATE)
                newPost.id = Date.now();
                posts.unshift(newPost); // Thêm lên đầu danh sách
            }
            
            renderPostTable();
            closePostModal();
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

// Khởi chạy lần đầu để hiển thị bảng
renderPostTable();