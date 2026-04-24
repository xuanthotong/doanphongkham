const express = require('express');
const router = express.Router();

// Nạp Controller
const shiftController = require('../controllers/shiftController');
const appointmentController = require('../controllers/appointmentController');

// ====================================
// API CA LÀM VIỆC (SHIFT)
// ====================================
router.post('/shifts', shiftController.createShift);
router.get('/shifts/doctor/:id', shiftController.getShiftsByDoctor);
router.put('/shifts/:id', shiftController.updateShift);
router.delete('/shifts/:id', shiftController.deleteShift);
router.get('/shifts', shiftController.getAllShifts);
// ====================================
// API LỊCH HẸN (APPOINTMENT)
// ====================================
router.get('/appointments', appointmentController.getAllAppointments);
router.get('/appointments/doctor/:id', appointmentController.getAppointmentsByDoctor);
router.put('/appointments/:id/status', appointmentController.updateAppointmentStatus);
router.delete('/appointments/:id', appointmentController.deleteAppointment);


module.exports = router;
