const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// 1. API lấy danh sách các giờ đã được đặt để khóa ở Frontend
router.get('/booked', appointmentController.getBookedSlots);

// 2. API Tạo lịch khám mới (Bệnh nhân đặt lịch)
router.post('/', appointmentController.createAppointment);

// 3. API lấy danh sách lịch sử khám của 1 bệnh nhân
router.get('/patient/:id', appointmentController.getAppointmentsByPatient);

// API Đánh giá lịch khám
router.post('/:id/rate', appointmentController.rateAppointment);

// 4. API lấy danh sách lịch hẹn của 1 bác sĩ
router.get('/doctor/:id', appointmentController.getAppointmentsByDoctor);

// 4. API Cập nhật trạng thái lịch hẹn (Duyệt, Hủy, Hoàn thành)
router.put('/:id/status', appointmentController.updateAppointmentStatus);

// API Cập nhật riêng ghi chú/đơn thuốc của Bác sĩ
router.put('/:id/note', appointmentController.updateAppointmentNote);

// 5. API Lấy TẤT CẢ lịch hẹn cho Admin
router.get('/', appointmentController.getAllAppointments);

// 6. API Xóa lịch hẹn
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;