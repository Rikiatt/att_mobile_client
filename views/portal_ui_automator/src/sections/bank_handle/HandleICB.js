import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { icbScanQR, icbLogin, icbConfirmAfterFace } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleICB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>ICB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>          
          <Tooltip title="Scan QR >> Login" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => icbScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
            </Button>
          </Tooltip>  

          <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => icbLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>  

          <Tooltip title="Xác nhận (sau quét mặt - thủ công)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => icbConfirmAfterFace({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét mặt - thủ công)
            </Button>
          </Tooltip>

          {/* <Tooltip title="Xác nhận (sau quét QR)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => icbConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét QR)
            </Button>
          </Tooltip> */}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleICB;