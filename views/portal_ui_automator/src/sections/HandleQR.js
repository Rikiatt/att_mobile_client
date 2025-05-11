import { Accordion, AccordionDetails, AccordionSummary, Stack, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { getQrDevice, downloadQrForAccount } from '../api/device';

const bankBins = {
  vcb: '970436', bidv: '970418', vietbank: '970433', tcb: '970407', stb: '970403', vpb: '970432',
  eib: '970431', abb: '970425', vba: '970405', bab: '970409', bvb: '970438', vcbneo: '970444',
  cimb: '422589', citibank: '533948', coopbank: '970446', dbs: '796500', vikki: '970406',
  gpb: '970408', hdb: '970437', hlbvn: '970442', hsbc: '458761', icb: '970415', ivb: '970434',
  ncb: '970419', nab: '970428', acb: '970416', shb: '970443', shbvn: '970424', cake: '546034',
  sgicb: '970400', seab: '970440', scb: '970429', pvcb: '970412', pgb: '970430', pbvn: '970439',
  mbv: '970414', ocb: '970448', lio: '963369', msb: '970426', mb: '970422', mafc: '977777',
  lpbank: '970449', kbank: '668888', klb: '970452', kebhanahcm: '970466', kebhanahn: '970467',
  kbhn: '970462', kbhcm: '970463', ubank: '546035', scvn: '970410', tpb: '970423', timo: '963388',
  uob: '970458', vab: '970427', vbsp: '999888', vccb: '970454', vib: '970441', vnpbmoney: '971011',
  vrb: '970421', vtlmoney: '971005', wvn: '970457'
};

const bankLabels = {
  vcb: 'Vietcombank', bidv: 'BIDV', vietbank: 'VietBank', tcb: 'Techcombank', stb: 'Sacombank',
  vpb: 'VPBank', eib: 'Eximbank', abb: 'An Bình Bank', vba: 'VietinBank', bab: 'Bắc Á Bank',
  bvb: 'Bản Việt', vcbneo: 'Vietcombank Neo', cimb: 'CIMB', citibank: 'CitiBank', coopbank: 'Co-opBank',
  dbs: 'DBS Bank', vikki: 'Viet Capital Bank', gpb: 'GPBank', hdb: 'HDBank', hlbvn: 'Hong Leong Bank',
  hsbc: 'HSBC', icb: 'VietinBank', ivb: 'Indovina Bank', ncb: 'NCB', nab: 'Nam Á Bank',
  acb: 'ACB', shb: 'SHB', shbvn: 'SHB Finance', cake: 'Cake Digital Bank', sgicb: 'Saigon Industry Bank',
  seab: 'SeaBank', scb: 'SCB', pvcb: 'PVcomBank', pgb: 'PG Bank', pbvn: 'Public Bank Vietnam',
  mbv: 'MB Bank (VP)', ocb: 'OCB', lio: 'LienvietPostBank', msb: 'MSB', mb: 'MB Bank',
  mafc: 'MAFC', lpbank: 'LPBank', kbank: 'KBank', klb: 'KLB', kebhanahcm: 'KEB Hana HCM',
  kebhanahn: 'KEB Hana HN', kbhn: 'KB HN', kbhcm: 'KB HCM', ubank: 'Ubank', scvn: 'Standard Chartered',
  tpb: 'TPBank', timo: 'Timo', uob: 'UOB', vab: 'VAB', vbsp: 'Ngân hàng Chính sách',
  vccb: 'Viet Capital Bank', vib: 'VIB', vnpbmoney: 'VNPayMoney', vrb: 'VRB', vtlmoney: 'Viettel Money',
  wvn: 'Woori Bank'
};

const HandleQR = ({ item }) => {
  const [expand, setExpand] = useState(false);
  const [qrcode, setQrcode] = useState('https://media.tenor.com/tga0EoNOH-8AAAAC/loading-load.gif');
  const [open, setOpen] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');

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

  const handleGenerateQR = async () => {
    if (!bankCode || !accountNumber || !amount) {
      alert('Vui lòng nhập đủ thông tin.');
      return;
    }

    const result = await downloadQrForAccount({
      bank_code: bankCode,
      bank_account: accountNumber,
      device_id: item.id,
      amount: amount
    });

    if (!result.status) {
      alert(result.message || 'Không thể tạo QR');
    } else {
      alert(`QR đã được tạo và lưu vào /sdcard/${item.id}_vietqr.png`);
      console.log("QR created successfully:", result.vietqr_url);
      setOpen(false);
      setBankCode('');
      setAccountNumber('');
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
              <InputLabel id="bank-select-label">Ngân hàng thụ hưởng</InputLabel>
              <Select
                labelId="bank-select-label"
                value={bankCode}
                label="Ngân hàng thụ hưởng"
                onChange={(e) => setBankCode(e.target.value)}
                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
              >
                {Object.entries(bankLabels).map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {code.toUpperCase()} - {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Số tài khoản"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              size="small"
            />
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

export default HandleQR;
