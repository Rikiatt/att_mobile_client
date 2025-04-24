import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { ncbScanQR, ncbLogin } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleNCB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>NCB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Start >> ScanQR" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => ncbScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
            </Button>
          </Tooltip>

          <Tooltip title="Nhập mật khẩu và đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => ncbLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleNCB;