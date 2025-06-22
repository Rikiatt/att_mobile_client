import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box,
    Button,
    Stack
} from '@mui/material';
import { getOrder, clearOrder } from '../api/order';
import { swalToast } from '../utils/swal';

function OrderPopup({ open, onClose, deviceId }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadOrder = async () => {
        if (!deviceId) return;
        const result = await getOrder(deviceId);
        if (result.valid && result.data) {
            setOrder(result.data);
        } else {
            setOrder(null);
        }
    };

    useEffect(() => {
        if (open) {
            loadOrder();
        }
    }, [open, deviceId]);

    const handleDeleteOrder = async () => {
        setLoading(true);
        const result = await clearOrder(deviceId);
        setLoading(false);
        if (result.valid) {
            swalToast('success', 'Thành công');
            setOrder(null);
        } else {
            swalToast('error', result.message || 'Xóa đơn thất bại');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle fontWeight="bold">
                DANH SÁCH ĐƠN HÀNG ATTPAY+ ({deviceId})
            </DialogTitle>
            <DialogContent>
                {order ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography><strong>Mã đơn:</strong> {order.id}</Typography>
                        <Typography><strong>Ngân hàng:</strong> {order.bank}</Typography>
                        <Typography><strong>Số tài khoản:</strong> {order.account}</Typography>
                        <Typography><strong>Số tiền:</strong> {parseInt(order.amount).toLocaleString()}</Typography>
                        <Typography><strong>Trạng thái:</strong> {order.trans_status}</Typography>

                        <Stack direction="row" spacing={2} mt={3}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleDeleteOrder}
                                disabled={loading}
                            >
                                Xóa đơn
                            </Button>
                            <Button variant="outlined" onClick={onClose}>
                                Đóng
                            </Button>
                        </Stack>
                    </Box>
                ) : (
                    <Typography color="textSecondary">Không có dữ liệu đơn hàng phù hợp.</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default OrderPopup;