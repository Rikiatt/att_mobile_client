import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
import { tpbScanQR } from '../../services/handle.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';

const HandleTPB = ({ item, X, Y, setLoading }) => {
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
      <AccordionSummary expandIcon={<ExpandMore />}>TBP</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Start >> ScanQR " arrow>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              fullWidth
              onClick={() => tpbScanQR({ device_id: item.id, X, Y }, setLoading)}
            >
              Quét QR
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleTPB;