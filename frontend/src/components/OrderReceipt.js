import React from 'react';

export const OrderReceipt = React.forwardRef(({ order }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} style={{ padding: '40px', fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>KURUWITA OPTICAL</h1>
        <p style={{ margin: '5px 0' }}>Professional Eye Care & Opticians</p>
        <p style={{ fontSize: '12px' }}>Tel: 07x-xxxxxxx | Your Shop Address Here</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>Customer:</strong> {order.customer_name}<br />
          <strong>Phone:</strong> {order.phone}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>Order #:</strong> {order.order_number}<br />
          <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '10px 0' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '10px 0' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 0' }}>Frame: {order.frame}</td>
            <td style={{ textAlign: 'right' }}>-</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 0' }}>Lens: {order.lens_type}</td>
            <td style={{ textAlign: 'right' }}>-</td>
          </tr>
        </tbody>
      </table>

      <div style={{ float: 'right', width: '200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total:</span> <span>Rs. {order.total_amount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>Advance:</span> <span>Rs. {order.advance_amount}</span>
        </div>
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
          <span>Balance:</span> <span>Rs. {order.balance_amount}</span>
        </div>
      </div>

      <div style={{ marginTop: '100px', textAlign: 'center', fontSize: '12px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        Thank you for choosing Kuruwita Optical! <br />
        Please bring this receipt for collection.
      </div>
    </div>
  );
});