import {
  Accordion, AccordionDetails, AccordionSummary, Stack, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Box
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { downloadQrForAccount } from '../api/device';
import axios from 'axios';

const HandleTestQR = ({ item }) => {
  const [expand, setExpand] = useState(false);
  const [open, setOpen] = useState(false);
  const [bankData, setBankData] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('local-banks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBankData(parsed);
      } catch (e) {
        console.error('Lỗi đọc local-banks từ localStorage:', e);
      }
    }
  }, []);

  const handleGenerateQR = async () => {
    if (!selectedEntry || !amount) {
      alert('Vui lòng nhập đủ thông tin.');
      return;
    }
    const [bank_code, bank_account] = selectedEntry.split('|');

    const result = await downloadQrForAccount({
      bank_code,
      bank_account,
      device_id: item.id,
      amount
    });

    if (!result.status) {
      alert(result.message || 'Không thể tạo QR');
    } else {
      alert(`QR đã được tạo và lưu vào /sdcard/DCIM/Camera/${item.id}_vietqr.png`);
      console.log('QR created successfully:', result.vietqr_url);
      setOpen(false);
      setSelectedEntry('');
      setAmount('');
    }
  };

  return (
    <>
      <Accordion
        disableGutters
        square
        sx={{ boxShadow: 0, border: `1px solid ${grey[400]}`, '&::before': { display: 'none' } }}
        onChange={(event, expanded) => { setExpand(expanded); }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>TEST THẺ</AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1} alignItems="center" justifyContent="space-between">
            <Tooltip title="Test thẻ" arrow>
              <Button
                size="small"
                variant="contained"
                color="inherit"
                fullWidth
                onClick={() => setOpen(true)}
              >
                Test thẻ
              </Button>
            </Tooltip>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            mx: 'auto',
            width: '100%',
            maxWidth: 400,
          }
        }}
      >
        <DialogTitle textAlign="center">Tạo QR chuyển tiền</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="bank-entry-label">NGÂN HÀNG - SỐ TÀI KHOẢN</InputLabel>
              <Select
                labelId="bank-entry-label"
                value={selectedEntry}
                label="NGÂN HÀNG - SỐ TÀI KHOẢN"
                onChange={(e) => setSelectedEntry(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
              >
                {Array.isArray(bankData) && bankData.map((entry, idx) => (
                  <MenuItem
                    key={idx}
                    value={`${entry['NGÂN HÀNG']}|${entry['SỐ TÀI KHOẢN']}`}
                  >
                    {`${entry['NGÂN HÀNG']} - ${entry['SỐ TÀI KHOẢN']}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Số tiền"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="small"
              type="number"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleGenerateQR} variant="contained">Tạo QR</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HandleTestQR;
