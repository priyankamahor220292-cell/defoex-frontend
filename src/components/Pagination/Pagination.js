import React from 'react';
import './Pagination.css';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div className="pagination">
      <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>‹</button>
      {start > 1 && <><button className="page-btn" onClick={() => onPageChange(1)}>1</button><span className="page-dots">…</span></>}
      {pages.map(p => (
        <button key={p} className={`page-btn${p === currentPage ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      {end < totalPages && <><span className="page-dots">…</span><button className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
      <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>›</button>
    </div>
  );
}
