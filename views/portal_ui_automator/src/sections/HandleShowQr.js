import { Accordion, AccordionDetails, AccordionSummary, Stack } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { getQrDevice } from '../api/device';

const HandleShowQr = ({ item }) => {
  const [expand, setExpand] = useState(false);
  // device_id: item.id
  const [qrcode, setQrcode] = useState('https://media.tenor.com/tga0EoNOH-8AAAAC/loading-load.gif');
  useEffect(() => {
    const handel = async () => {
      if (expand) {
        const response = await getQrDevice(item.id);
        setQrcode(response?.result ?? 'https://media.tenor.com/tga0EoNOH-8AAAAC/loading-load.gif');
      }
    };
    const intervalId = setInterval(handel, 1500);
    return () => clearInterval(intervalId);
  }, [expand]);
  return (
    <Accordion
      disableGutters
      square
      sx={{
        boxShadow: 0,
        border: `1px solid ${grey[400]}`,
        '&::before': {
          display: 'none'
        }
      }}
      onChange={(event, expanded) => { setExpand(expanded) }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>QR</AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1} alignItems="center" justifyContent="space-between">
          <img width={180} src={qrcode} />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default HandleShowQr;