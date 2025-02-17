import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { babScanQR } from '../../services/handle.service';
import { babLogin } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleBAB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>BAB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
            <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
                <Button
                    size="small"
                    variant="contained"
                    color="inherit"
                    fullWidth
                    onClick={() => babLogin({ device_id: item.id, X, Y }, setLoading)}
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
                    onClick={() => babScanQR({ device_id: item.id, X, Y }, setLoading)}
                >
                    Quét QR
                </Button>
            </Tooltip>          
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleBAB;