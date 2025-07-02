import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Tooltip } from '@mui/material';
// import { bankTransfer } from '../../services/handle.service';
import { startTransfer, stopTransfer } from '../../services/bank.service';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useState, useRef, useEffect } from 'react';

// const HandleTransfer = ({ item, X, Y, setLoading }) => {
//   return (
//     <Accordion
//       disableGutters
//       square
//       sx={{
//         boxShadow: 0,
//         border: `1px solid ${grey[400]}`,
//         '&:not(:last-child)': {
//           borderBottom: 0
//         },
//         '&::before': {
//           display: 'none'
//         }
//       }}
//     >
//       <AccordionSummary expandIcon={<ExpandMore />}>CHUYỂN TIỀN</AccordionSummary>
//       <AccordionDetails>
//         <Stack spacing={1}>
//           <Tooltip title="Áp dụng cho: EIB, SHB, TPB, NAB, VPB, MB, OCB, SEAB, STB" arrow>
//             <Button
//               size="small"
//               variant="contained"
//               color="inherit"
//               fullWidth
//               onClick={() => bankTransfer({ device_id: item.id, X, Y }, setLoading)}
//             >
//               BẬT TỰ ĐỘNG
//             </Button>
//           </Tooltip>

//           {/* <Tooltip title="Áp dụng cho: EIB, SHB, TPB, NAB, VPB, MB, OCB, SEAB, STB" arrow>
//             <Button
//               size="small"
//               variant="contained"
//               color="inherit"
//               fullWidth
//               onClick={() => stopBankTransfer({ device_id: item.id, X, Y }, setLoading)}
//             >
//               TẮT TỰ ĐỘNG
//             </Button>
//           </Tooltip> */}
//         </Stack>
//       </AccordionDetails>
//     </Accordion>
//   );
// };

const HandleTransfer = ({ item, X, Y, setLoading }) => {
  const [autoMode, setAutoMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`auto-${item.id}`);
    if (saved === 'true') {
      setAutoMode(true);
      autoStartTransfer();
    }
  }, []);

  const autoStartTransfer = async () => {
    setLoading(true);
    await startTransfer({ device_id: item.id, bank: item.bank });
    setLoading(false);
  };

  const toggleAutoMode = async () => {
    const newState = !autoMode;
    setAutoMode(newState);
    localStorage.setItem(`auto-${item.id}`, newState);

    if (newState) {
      await autoStartTransfer();
    } else {
      await stopTransfer({ device_id: item.id });
    }
  };

  return (
    <Accordion disableGutters square sx={{
      boxShadow: 0,
      border: `1px solid ${grey[400]}`,
      '&:not(:last-child)': { borderBottom: 0 },
      '&::before': { display: 'none' }
    }}>
      <AccordionSummary expandIcon={<ExpandMore />}>CHUYỂN TIỀN</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Tooltip title="Áp dụng cho: EIB, SHB, TPB, NAB, VPB, MB, OCB, SEAB, STB" arrow>
            <Button
              size="small"
              variant="contained"
              color={autoMode ? 'error' : 'inherit'}
              fullWidth
              onClick={toggleAutoMode}
            >
              {autoMode ? 'TẮT TỰ ĐỘNG' : 'BẬT TỰ ĐỘNG'}
            </Button>
          </Tooltip>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleTransfer;