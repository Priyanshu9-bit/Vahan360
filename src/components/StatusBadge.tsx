import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const norm = status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';
  let label = status;

  switch (norm) {
    // Trips
    case 'planned':
      bg = 'bg-slate-100 text-slate-700 border-slate-300';
      dot = 'bg-slate-500';
      label = 'Planned';
      break;
    case 'assigned':
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
      dot = 'bg-blue-500';
      label = 'Assigned';
      break;
    case 'in_progress':
      bg = 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse';
      dot = 'bg-amber-500';
      label = 'In Progress';
      break;
    case 'completed':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dot = 'bg-emerald-500';
      label = 'Completed';
      break;
    case 'cancelled':
      bg = 'bg-rose-50 text-rose-700 border-rose-300';
      dot = 'bg-rose-500';
      label = 'Cancelled';
      break;

    // Payments & Financials
    case 'paid':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dot = 'bg-emerald-500';
      label = 'Paid';
      break;
    case 'partial':
      bg = 'bg-amber-50 text-amber-800 border-amber-300';
      dot = 'bg-amber-500';
      label = 'Partial Payment';
      break;
    case 'pending':
      bg = 'bg-rose-50 text-rose-700 border-rose-300';
      dot = 'bg-rose-500';
      label = 'Payment Due';
      break;

    // Approvals
    case 'approved':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dot = 'bg-emerald-500';
      label = 'Approved';
      break;
    case 'rejected':
      bg = 'bg-rose-50 text-rose-800 border-rose-300';
      dot = 'bg-rose-500';
      label = 'Rejected';
      break;
    case 'pending_approval':
      bg = 'bg-amber-50 text-amber-800 border-amber-300';
      dot = 'bg-amber-500';
      label = 'Pending Approval';
      break;
    case 'resigned':
      bg = 'bg-orange-50 text-orange-800 border-orange-300';
      dot = 'bg-orange-500';
      label = 'Resigned';
      break;
    case 'removed':
      bg = 'bg-slate-100 text-slate-700 border-slate-300';
      dot = 'bg-slate-500';
      label = 'Removed';
      break;

    // Documents
    case 'valid':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dot = 'bg-emerald-500';
      label = 'Valid';
      break;
    case 'expiring_soon':
      bg = 'bg-amber-50 text-amber-800 border-amber-300';
      dot = 'bg-amber-500';
      label = 'Expiring Soon';
      break;
    case 'expired':
      bg = 'bg-rose-50 text-rose-800 border-rose-300';
      dot = 'bg-rose-500';
      label = 'Expired';
      break;
    case 'renewal_pending':
      bg = 'bg-indigo-50 text-indigo-800 border-indigo-300';
      dot = 'bg-indigo-500';
      label = 'Renewal Pending';
      break;

    // Vehicle Status
    case 'active':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dot = 'bg-emerald-500';
      label = 'Active';
      break;
    case 'in_service':
      bg = 'bg-amber-50 text-amber-800 border-amber-300';
      dot = 'bg-amber-500';
      label = 'In Service';
      break;
    case 'inactive':
    case 'suspended':
      bg = 'bg-rose-50 text-rose-800 border-rose-300';
      dot = 'bg-rose-500';
      label = 'Suspended';
      break;

    // Challans
    case 'unpaid':
      bg = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      dot = 'bg-rose-500';
      label = 'Unpaid Challan';
      break;
    case 'disputed':
      bg = 'bg-purple-50 text-purple-800 border-purple-300';
      dot = 'bg-purple-500';
      label = 'Disputed';
      break;

    default:
      label = status || 'Unknown';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${px} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
}
