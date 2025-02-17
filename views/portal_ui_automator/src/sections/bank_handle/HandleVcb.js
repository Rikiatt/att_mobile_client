import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { vcbLogin, vcbNewClickConfirm, vcbNewGetOTP } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleVCB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>VCB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vcbLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>
          <Tooltip title="Mã PIN và xác nhận" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vcbNewClickConfirm({ device_id: item.id, X, Y }, setLoading)}
            >
              Xác nhận
            </Button>
          </Tooltip>
          <Tooltip title="Lấy mã OTP" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => vcbNewGetOTP({ device_id: item.id, X, Y }, setLoading)}
            >
              Lấy mã OTP
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleVCB;
