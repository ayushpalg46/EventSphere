



function exportAttendeesToCSV(attendees) {
  if (!attendees || attendees.length === 0) {
    return 'Booking ID,Name,Email,Phone,Ticket Type,Quantity,Paid,Payment ID,Status,Checked In,Check-in Time,Booked Date\n';
  }

  const headers = [
    'Booking ID',
    'Name',
    'Email',
    'Phone',
    'Ticket Type',
    'Quantity',
    'Paid (Rs.)',
    'Payment ID',
    'Payment Status',
    'Checked In',
    'Check-in Time',
    'Booked Date'
  ];

  const rows = attendees.map(att => {
    
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      att.booking_id,
      att.name,
      att.email,
      att.phone || 'N/A',
      att.ticket_type,
      att.quantity,
      att.total_amount,
      att.payment_id,
      att.payment_status,
      att.checked_in ? 'YES' : 'NO',
      att.checkin_time || 'N/A',
      att.booked_at
    ].map(escapeCsv).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  exportAttendeesToCSV
};
