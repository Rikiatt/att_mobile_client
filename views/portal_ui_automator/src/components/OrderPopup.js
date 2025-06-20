import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box
} from '@mui/material';
import { getOrder } from '../api/order';

function OrderPopup({ open, onClose, deviceId }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!deviceId) return;
      const result = await getOrder(deviceId);
      if (result.valid && result.data) {
        setOrder(result.data);
      } else {
        setOrder(null);
      }
    };

    if (open) {
      loadOrder();
    }
  }, [open, deviceId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight="bold">
        DANH SÁCH ĐƠN HÀNG RIKI+ ({deviceId})
      </DialogTitle>
      <DialogContent>
        {order ? (
          <Box sx={{ mt: 2 }}>
            <Typography><strong>Mã đơn:</strong> {order.id}</Typography>
            <Typography><strong>Ngân hàng:</strong> {order.bank}</Typography>
            <Typography><strong>Số tài khoản:</strong> {order.account}</Typography>
            <Typography><strong>Số tiền:</strong> {parseInt(order.amount).toLocaleString()}</Typography>
          </Box>
        ) : (
          <Typography color="textSecondary">Không có dữ liệu đơn hàng phù hợp.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OrderPopup;