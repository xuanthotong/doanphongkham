const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const shiftController = require('../controllers/shiftController');

// CÁC API QUẢN LÝ CA LÀM VIỆC CỦA BÁC SĨ
router.get('/shifts', shiftController.getAllShifts);
router.get('/shifts/admin/all', shiftController.getAllShiftsAdmin); // Route dành riêng cho Admin
router.post('/shifts', shiftController.createShift);
router.get('/shifts/:id', shiftController.getShiftsByDoctor);
router.put('/shifts/:id', shiftController.updateShift);
router.put('/shifts/:id/stop', shiftController.stopShift);
router.put('/shifts/:id/resume', shiftController.resumeShift);
router.delete('/shifts/:id', shiftController.deleteShift);

// CÁC API QUẢN LÝ BÁC SĨ (Dành cho Admin)
router.get('/', doctorController.getAllDoctors);
router.post('/', doctorController.createDoctor);
router.get('/:id/reviews', doctorController.getDoctorReviews);
router.put('/:id', doctorController.updateDoctor);
router.delete('/:id', doctorController.deleteDoctor);

module.exports = router;