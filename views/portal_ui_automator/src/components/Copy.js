import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyContent } from '../helpers/content';

const CopyContent = ({ text }) => {
  return (
    <Tooltip title="Sao chép" arrow>
      <IconButton onClick={() => copyContent(text)} disableRipple size="small">
        <ContentCopyIcon sx={{ fontSize: 14, color: '#172B4D', mb: 0.2 }} />
      </IconButton>
    </Tooltip>
  );
};

export default CopyContent;
