import { Accordion, AccordionDetails, AccordionSummary, Stack, Tooltip, Button } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { getQrDevice, downloadQrForAccount } from '../api/device';
import Swal from 'sweetalert2';

const HandleQR = ({ item }) => {
  const [expand, setExpand] = useState(false);
  const [qrcode, setQrcode] = useState('https://media.tenor.com/tga0EoNOH-8AAAAC/loading-load.gif');

  useEffect(() => {
    const handel = async () => {
      if (expand) {
        const response = await getQrDevice(item.id);
        setQrcode(response?.result ?? 'https://media.tenor.com/tga0EoNOH-8AAAAC/loading-load.gif');
      }
    };
    const intervalId = setInterval(handel, 1500);
    return () => clearInterval(intervalId);
  }, [expand, item.id]);

  const handleTestChuyenTien = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tạo QR chuyển tiền',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Ngân hàng (vd: ncb, bidv, vcb)" />' +
        '<input id="swal-input2" class="swal2-input" placeholder="Số tài khoản" />',
      focusConfirm: false,
      preConfirm: () => {
        const bankCode = document.getElementById('swal-input1').value?.trim().toLowerCase();
        const accountNumber = document.getElementById('swal-input2').value?.trim();

        if (!bankCode || !accountNumber) {
          Swal.showValidationMessage('Vui lòng nhập đủ thông tin ngân hàng và số tài khoản');
          return;
        }
        return { bank_code: bankCode, bank_account: accountNumber };
      },
      showCancelButton: true,
      confirmButtonText: 'Tạo QR'
    });

    if (formValues) {
      const result = await downloadQrForAccount({
        bank_code: formValues.bank_code,
        bank_account: formValues.bank_account,
        device_id: item.id
      });

      if (!result.status) {
        Swal.fire('Lỗi', result.message || 'Không thể tạo QR', 'error');
      } else {
        Swal.fire('Thành công', `QR đã được tạo và lưu vào /sdcard/${item.id}_vietqr.png`, 'success');
        console.log("QR created successfully:", result.vietqr_url);
      }
    }
  };

  return (
    <Accordion
      disableGutters
      square
      sx={{
        boxShadow: 0,
        border: `1px solid ${grey[400]}`,
        '&::before': { display: 'none' }
      }}
      onChange={(event, expanded) => { setExpand(expanded); }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>QR</AccordionSummary>

      <AccordionDetails>
        <Stack spacing={1} alignItems="center" justifyContent="space-between">
          <img width={180} src={qrcode} alt="QR Code" />
          <Tooltip title="Test chuyển tiền" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={handleTestChuyenTien}
            >
              Test thẻ
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleQR;