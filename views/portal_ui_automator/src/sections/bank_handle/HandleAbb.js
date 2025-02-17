import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { abbClickLogin } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleABB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>ABB</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Nhập mật khẩu và click đăng nhập" arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => abbClickLogin({ device_id: item.id, X, Y }, setLoading)}
            >
              Đăng nhập
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleABB;