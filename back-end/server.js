const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const chuyenKhoaRoutes = require('./src/routes/chuyenKhoaRoutes');
const postRoutes = require('./src/routes/postRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn dung lượng tải lên cho ảnh Base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/specialties', chuyenKhoaRoutes);
app.use('/api/posts', postRoutes);

// Khởi động server và kết nối DB
app.listen(PORT, async () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    await connectDB();
});
