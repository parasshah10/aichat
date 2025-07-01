const express = require('express');
const EditController = require('~/server/controllers/EditController');
const { initializeClient, addTitle } = require('~/server/services/Endpoints/google');
const {
  setHeaders,
  validateModel,
  validateEndpoint,
  buildEndpointOption,
} = require('~/server/middleware');

const router = express.Router();

router.post(
  '/',
  validateEndpoint,
  validateModel,
  buildEndpointOption,
  setHeaders,
  async (req, res, next) => {
    await EditController(req, res, next, initializeClient, addTitle);
  },
);

module.exports = router;
