import React from 'react';
import './Badge.css';

export default function Badge({ status }) {
  const map = {
    'Active': 'success', 'Approved': 'success',
    'Pending': 'warning',
    'Inactive': 'danger', 'Rejected': 'danger', 'Not Active': 'danger',
    'Completed': 'info', 'Cancelled': 'danger',
  };
  const color = map[status] || 'default';
  return <span className={`badge badge--${color}`}>{status}</span>;
}
