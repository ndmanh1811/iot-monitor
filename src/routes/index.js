const express = require('express');
const router = express.Router();

const sensorRoutes = require('./sensorRoutes');
const deviceRoutes = require('./deviceRoutes');
const actionRoutes = require('./actionRoutes');
const userRoutes = require('./userRoutes');

router.use('/sensors', sensorRoutes);
router.use('/devices', deviceRoutes);
router.use('/actions', actionRoutes);
router.use('/user', userRoutes);

module.exports = router;
