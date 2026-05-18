"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePaginationParams = parsePaginationParams;
function parsePaginationParams(query) {
    const page = Math.max(1, parseInt(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query?.pageSize) || 20));
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
//# sourceMappingURL=pagination.util.js.map