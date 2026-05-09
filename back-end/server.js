const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB, sql } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const chuyenKhoaRoutes = require('./src/routes/chuyenKhoaRoutes');
const postRoutes = require('./src/routes/postRoutes');
const doctorpageRoutes = require('./src/routes/doctorpageRoutes');
const qaRoutes = require('./src/routes/qaRoutes');
const passwordRoutes = require('./src/routes/passwordRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const appointmentController = require('./src/controllers/appointmentController');
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/specialties', chuyenKhoaRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', require('./src/routes/danhMucRoutes'));
app.use('/api', doctorpageRoutes);
app.use('/api/questions', qaRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chatbot', require('./src/routes/chatbotRoutes'));

app.listen(PORT, async () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    await connectDB();
});
