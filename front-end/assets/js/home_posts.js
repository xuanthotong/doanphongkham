let homePostsList = []; // Lưu trữ danh sách bài viết toàn cục
let homeCategoriesList = []; // Lưu trữ danh sách danh mục toàn cục

async function initHomePosts() {
    try {
        const res = await fetch('http://localhost:3000/api/categories');
        homeCategoriesList = await res.json();
    } catch (error) {
        console.error('Lỗi khi lấy danh sách danh mục:', error);
    }
    fetchHomePosts(); // Đợi lấy danh mục xong mới lấy bài viết
}

async function fetchHomePosts() {
    try {
        const response = await fetch('http://localhost:3000/api/posts');
        homePostsList = await response.json();
        renderHomePosts(homePostsList);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài viết:', error);
    }
}

function getCategoryName(id) {
    const cat = homeCategoriesList.find(c => c.id == id);
    return cat ? cat.ten_danh_muc : "Khác";
}

function formatDatePost(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function generatePostCardHTML(post) {
    const defaultImg = "https://placehold.co/400x250?text=No+Image";
    const imgSrc = post.anh_thu_nho && post.anh_thu_nho.trim() !== "" ? post.anh_thu_nho : defaultImg;
    const categoryName = getCategoryName(post.danh_muc_id);
    const excerpt = post.noi_dung ? post.noi_dung.substring(0, 80) + '...' : 'Đang cập nhật nội dung...';

    return `
        <div class="article-card"> 
            <div class="article-img" style="padding: 0; overflow: hidden; background-color: #f3f4f6;">
                <img src="${imgSrc}" onerror="this.onerror=null; this.src='${defaultImg}';" alt="${post.tieu_de}" style="width: 100%; height: 200px; object-fit: cover;">
            </div>
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-tag">${categoryName}</span>
                    <span><i class="fa-regular fa-clock"></i> 5 phút đọc</span>
                </div>
                <h3>${post.tieu_de}</h3>
                <p>${excerpt}</p>
                <div class="article-footer">
                    <span>${formatDatePost(post.ngay_xuat_ban)}</span>
                    <a href="#" class="article-link" onclick="showPostDetails(${post.id}, event)">Đọc thêm &rarr;</a>
                </div>
            </div>
        </div>
    `;
}

function renderHomePosts(posts) {
    const container = document.getElementById('post-list-container');
    if (!container) return; 

    container.innerHTML = ''; 

    // Chỉ lấy 3 bài viết mới nhất để hiển thị ra trang chủ cho gọn
    const recentPosts = posts.slice(0, 3);

    if (recentPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; width: 100%; grid-column: 1 / -1;">Hiện tại chưa có bài viết nào.</p>';
        renderAllPosts([]);
        return;
    }

    container.innerHTML = recentPosts.map(generatePostCardHTML).join('');
    
    // Đổ toàn bộ vào trang "Tất cả bài viết"
    renderAllPosts(posts);
}

function renderAllPosts(posts) {
    const container = document.getElementById('all-posts-list-container');
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; width: 100%; grid-column: 1 / -1;">Hiện tại chưa có bài viết nào.</p>';
        return;
    }
    container.innerHTML = posts.map(generatePostCardHTML).join('');
}

function showAllPosts(event) {
    if (event) event.preventDefault();
    if(document.getElementById('main-home-content')) document.getElementById('main-home-content').style.display = 'none';
    if(document.getElementById('post-detail-view')) document.getElementById('post-detail-view').style.display = 'none';
    if(document.getElementById('all-doctors-view')) document.getElementById('all-doctors-view').style.display = 'none';
    
    if(document.getElementById('all-posts-view')) document.getElementById('all-posts-view').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPostDetails(id, event) {
    if (event) event.preventDefault(); // Ngăn chặn nhảy lên đầu trang khi click thẻ <a>
    const post = homePostsList.find(p => p.id === id);
    if (!post) return;

    document.getElementById('page_post_title').innerText = post.tieu_de;
    document.getElementById('page_post_meta').innerHTML = `
        <span><i class="fa-solid fa-user-pen"></i> Tác giả: <strong style="color: #0369a1;">${post.tac_gia || 'Admin'}</strong></span>
        <span style="color: #d1d5db;">|</span>
        <span><i class="fa-regular fa-calendar"></i> ${formatDatePost(post.ngay_xuat_ban)}</span>
    `;
    
    const defaultImg = "https://placehold.co/800x400?text=No+Image";
    document.getElementById('page_post_img').src = post.anh_thu_nho && post.anh_thu_nho.trim() !== "" ? post.anh_thu_nho : defaultImg;
    
    // Đổi mỗi dấu xuống dòng (\n) thành 2 thẻ <br> để tạo khoảng cách giữa các đoạn văn (giống blog thật)
    document.getElementById('page_post_content').innerHTML = post.noi_dung ? post.noi_dung.replace(/\n/g, '<br><br>') : 'Đang cập nhật nội dung...';

    // Ẩn tất cả giao diện khác
    if(document.getElementById('main-home-content')) document.getElementById('main-home-content').style.display = 'none';
    if(document.getElementById('all-doctors-view')) document.getElementById('all-doctors-view').style.display = 'none';
    if(document.getElementById('all-posts-view')) document.getElementById('all-posts-view').style.display = 'none';
    
    if(document.getElementById('post-detail-view')) document.getElementById('post-detail-view').style.display = 'block';
    
    // Tự động cuộn êm mượt lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function returnToHome(event) {
    if (event) event.preventDefault();
    
    // Khôi phục trang chủ và ẩn các trang phụ
    if(document.getElementById('main-home-content')) document.getElementById('main-home-content').style.display = 'block';
    if(document.getElementById('post-detail-view')) document.getElementById('post-detail-view').style.display = 'none';
    if(document.getElementById('all-doctors-view')) document.getElementById('all-doctors-view').style.display = 'none';
    if(document.getElementById('all-posts-view')) document.getElementById('all-posts-view').style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', initHomePosts);