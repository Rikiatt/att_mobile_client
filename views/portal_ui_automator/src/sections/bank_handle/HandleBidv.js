import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { bidvLogin, bidvScanQR, bidvConfirm, bidvConfirmBeforeFace, bidvConfirmAfterFace } from '../../services/handle.service';
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
          <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>
          <Tooltip title="Thao tác quét QR" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
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
          {/* <Tooltip title="Click Xác nhận)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvTransferAndConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận
            </Button>
          </Tooltip> */}
          <Tooltip title="Xác nhận (sau quét QR))" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét QR)
            </Button>
          </Tooltip>
          <Tooltip title="Mã PIN & Xác nhận)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvConfirmBeforeFace({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (trước quét mặt)
            </Button>
          </Tooltip>
          <Tooltip title="Mã PIN & Xác nhận)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => bidvConfirmAfterFace({ device_id: item.id, X, Y }, setLoading)}
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