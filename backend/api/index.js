// api/index.js — entry point serverless para Vercel.
// Vercel detecta cualquier archivo bajo api/ y lo expone como función;
// acá simplemente reexportamos la app de Express ya armada en server.js.
module.exports = require('../server');
