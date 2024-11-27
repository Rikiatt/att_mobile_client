import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { commandList, commandParse } from '../../config';
import { blueGrey, grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { parseStringToJsonArray, randomId } from '../../utils/content';
import { swalToast } from '../../utils/swal';

const CreateMacro = (props) => {
  const { setOpen, open, setMutate, editData, setEditData } = props;

  const [command, setCommand] = useState('');
  const [macroTitle, setMacroTitle] = useState('');

  useEffect(() => {
    if (editData) {
      console.log(editData);
      let editCommand = '';
      setMacroTitle(editData.title);
      for (const action of editData.func) {
        const func = JSON.stringify(action);
        editCommand = `${editCommand}\n${func}`;
      }
      editCommand = editCommand.trimStart();
      setCommand(editCommand);
    }
  }, [editData]);

  const handleClose = () => {
    setOpen((prev) => !prev);
    setEditData(null);
  };

  const handleAddCommand = (key) => {
    const cmdSelected = commandParse.find((item) => item.key === key);
    const func = JSON.stringify(cmdSelected.func);
    setCommand((prev) => (prev === '' ? func : `${prev}\n${func}`));
  };

  const handleSave = () => {
    const result = parseStringToJsonArray(command);
    if (result.valid === false) {
      return swalToast('error', result.message);
    }
    if (editData) {
      const saveData = {
        title: macroTitle.trim(),
        key: editData.key,
        func: result.message
      };
      console.log(saveData);
      localStorage.setItem(editData.key, JSON.stringify(saveData));
    } else {
      const genId = `macro_${randomId()}`;
      const commandMacro = {
        title: macroTitle.trim(),
        key: genId,
        func: result.message
      };

      localStorage.setItem(genId, JSON.stringify(commandMacro));
    }

    handleClose();
    setMutate((prev) => !prev);
    swalToast('success', 'Lưu thành công');
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>{editData ? 'Chỉnh sửa Macro' : 'Tạo Macro'}</DialogTitle>
      <DialogContent sx={{ width: 500 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography>Tên Macro:</Typography>
            <TextField fullWidth size="small" value={macroTitle} onChange={(e) => setMacroTitle(e.target.value)} />
          </Box>
          <Box>
            <Typography>Chỉnh sửa lệnh:</Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  bgcolor: blueGrey[900],
                  color: blueGrey[50],
                  lineHeight: 2
                }
              }}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </Box>
          <Box>
            <Typography>Danh sách lệnh:</Typography>
            <Box sx={{ mt: 1, bgcolor: grey[100] }}>
              {commandList.map((item, index) => {
                return (
                  <Button
                    key={index}
                    fullWidth
                    endIcon={<AddIcon />}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => handleAddCommand(item.key)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ pb: 2 }}>
        <Button onClick={handleSave}>Lưu</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateMacro;