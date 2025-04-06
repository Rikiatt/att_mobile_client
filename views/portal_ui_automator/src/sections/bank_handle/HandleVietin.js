import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { vietinScanQR, vietinConfirmAfterFace } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleVietin = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>VTB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          {/* <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>          
          <Tooltip title="Xác nhận (sau quét QR)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét QR)
            </Button>
          </Tooltip> */}
          <Tooltip title="Scan QR >> Login" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
            </Button>
          </Tooltip>
          <Tooltip title="Xác nhận (sau quét mặt - thủ công)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinConfirmAfterFace({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét mặt - thủ công)
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleVietin;