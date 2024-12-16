import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { vietinLogin, vietinScanQR, vietinConfirm, vietinScanFaceConfirm } from '../../services/handle.service';
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
      <AccordionSummary expandIcon={<ExpandMore />}>Vietin</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Thao tác đăng nhập" arrow>
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
          <Tooltip title="Thao tác quét QR" arrow>
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
          <Tooltip title="Thao tác mã PIN và xác nhận" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Mã PIN và xác nhận
            </Button>
          </Tooltip>
          <Tooltip title="Xác nhận (sau quét mặt)" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vietinScanFaceConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận (sau quét mặt)
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleVietin;