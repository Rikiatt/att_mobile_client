import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { anotherBankCheckQR, bidvLoginAndScanQR, bidvTransferAndConfirm, bidvScanFaceConfirm } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleBIDV = ({ item, X, Y, setLoading }) => {
  return (
    <Accordion
      disableGutters
      square
      sx={{
        boxShadow: 0,
        border: `1px solid ${grey[400]}`,
        '&:not(:last-child)': {
          borderBottom: 0
        },
        '&::before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>BIDV</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          {/* <Tooltip title="Thao tác đăng nhập vào bank app khác để check QR" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => anotherBankCheckQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Check QR
            </Button>
          </Tooltip> */}
          <Tooltip title="Thao tác đăng nhập và thao tác quét QR" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvLoginAndScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập và quét QR
            </Button>
          </Tooltip>
          {/* <Tooltip title="Chọn ảnh QR trong thư viện" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => clickScanQRBIDV({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
            </Button>
          </Tooltip> */}
          <Tooltip title="Click Next >> nhập mã PIN >> Xác nhận)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvTransferAndConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Chuyển tiền và xác nhận
            </Button>
          </Tooltip>
          <Tooltip title="Nhập mã PIN >> Xác nhận)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvScanFaceConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét mặt)
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleBIDV;