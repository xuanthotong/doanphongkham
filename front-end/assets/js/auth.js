// Gán hàm này vào sự kiện submit form Đăng nhập của bạn
async function handleLogin(event) {
    event.preventDefault();

    // Đổi lại ID cho đúng với các thẻ input trong HTML của bạn
    const ten_dang_nhap = document.getElementById('login_username').value; 
    const mat_khau = document.getElementById('login_password').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten_dang_nhap, mat_khau })
        });

        const data = await response.json();

        if (response.ok) {
            // Đăng nhập thành công: Lưu Token & User Info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userInfo', JSON.stringify(data.user));

            alert('Đăng nhập thành công!');
            
            // Điều hướng đúng với Vai trò (Admin -> Admin Dashboard, Bệnh nhân -> Trang chủ,...)
            window.location.href = data.redirectUrl; 
        } else {
            alert(data.message || 'Đăng nhập thất bại!');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Không thể kết nối tới Server!');
    }
}

// Gán hàm này vào sự kiện submit form Đăng ký của bạn
async function handleRegister(event) {
    event.preventDefault();

    // Đổi lại ID cho đúng với các thẻ input trong HTML của bạn
    const ten_dang_nhap = document.getElementById('reg_username').value;
    const mat_khau = document.getElementById('reg_password').value;
    const email = document.getElementById('reg_email').value;
    const ho_ten = document.getElementById('reg_fullname').value;
    const so_dien_thoai = document.getElementById('reg_phone').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ten_dang_nhap, mat_khau, email, ho_ten, so_dien_thoai })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Đăng ký tài khoản thành công! Vui lòng tiến hành đăng nhập.');
            window.location.href = 'login.html';
        } else {
            alert(data.message || 'Lỗi đăng ký!');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Không thể kết nối tới Server!');
    }
}

// Hàm Ẩn / Hiện mật khẩu dùng chung
function togglePassword(icon, inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash"); // Đổi sang icon mắt nhắm
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye"); // Đổi lại thành icon mắt mở
    }
}