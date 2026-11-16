// src/utils/pagination.js
// Paginación opcional: solo se activa si el caller manda ?page o ?limit.
// Así los endpoints siguen devolviendo el array completo para quien ya
// depende de eso (selects de clientes/proveedores, dashboard, reportes).

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function wantsPagination(query) {
  return query.page !== undefined || query.limit !== undefined;
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function buildEnvelope(rows, total, page, pageSize) {
  return {
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { wantsPagination, parsePagination, buildEnvelope };
