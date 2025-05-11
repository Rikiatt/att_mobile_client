import { Accordion, AccordionDetails, AccordionSummary, Stack, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { getQrDevice, downloadQrForAccount } from '../api/device';

const bankLabels = {
    abb: 'An Bình Bank',
    acb: 'ACB',
    bab: 'Bắc Á Bank',
    bab: 'Bắc Á Bank',
    bidv: 'BIDV',
    bvb: 'Bản Việt',
    cake: 'Cake Digital Bank',
    cimb: 'CIMB',
    citibank: 'CitiBank',
    coopbank: 'Co-opBank',
    dbs: 'DBS Bank',
    eib: 'Eximbank',
    gpb: 'GPBank',
    hdb: 'HDBank',
    hlbvn: 'Hong Leong Bank',
    hsbc: 'HSBC',
    icb: 'VietinBank',
    ivb: 'Indovina Bank',
    kbhn: 'KB HN',
    kbhcm: 'KB HCM',
    kbank: 'KBank',
    kebhanahcm: 'KEB Hana HCM',
    kebhanahn: 'KEB Hana HN',
    klb: 'KLB',
    lio: 'LienvietPostBank',
    lpbank: 'LPBank',
    mafc: 'MAFC',
    mb: 'MB Bank',
    mbv: 'MB Bank (VP)',
    msb: 'MSB',
    nab: 'Nam Á Bank',
    ncb: 'NCB',
    ocb: 'OCB',
    pbvn: 'Public Bank Vietnam',
    pgb: 'PG Bank',
    pvcb: 'PVcomBank',
    scb: 'SCB',
    scvn: 'Standard Chartered',
    seab: 'SeaBank',
    sgicb: 'Saigon Industry Bank',
    shb: 'SHB',
    shbvn: 'SHB Finance',
    stb: 'Sacombank',
    tcb: 'Techcombank',
    timo: 'Timo',
    tpb: 'TPBank',
    ubank: 'Ubank',
    uob: 'UOB',
    vab: 'VAB',
    vba: 'VietinBank',
    vcb: 'Vietcombank',
    vcbneo: 'Vietcombank Neo',
    vccb: 'Viet Capital Bank',
    vib: 'VIB',
    vietbank: 'VietBank',
    vikki: 'Viet Capital Bank',
    vnpbmoney: 'VNPayMoney',
    vrb: 'VRB',
    vpb: 'VPBank',
    vtlmoney: 'Viettel Money',
    wb: 'Woori Bank',
    wvn: 'Woori Bank'
};

const HandleTestQR = ({ item }) => {
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
        <AccordionSummary expandIcon={<ExpandMore />}>Test thẻ</AccordionSummary>

        <AccordionDetails>
          <Stack spacing={1} alignItems="center" justifyContent="space-between">
            <img width={180} src={qrcode} alt="QR Code" />
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

export default HandleTestQR;
