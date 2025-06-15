import {
    Avatar,
    Box,
    Button,
    Card,
    FormControl,
    Grid,
    IconButton,
    MenuItem,
    Modal,
    Select,
    Stack,
    Tooltip,
    Typography
  } from '@mui/material';
  import { blue, grey } from '@mui/material/colors';
  import { useEffect, useState } from 'react';
  import CreateMacro from '../sections/macro/createMacro';
  
  import EditIcon from '@mui/icons-material/Edit';
  import BackspaceIcon from '@mui/icons-material/Backspace';
  import PlayCircleIcon from '@mui/icons-material/PlayCircle';
  import { swalInfoChooseText, swalToast } from '../utils/swal';
  import { runMacro } from '../services/handle.service';
  import { randomId } from '../utils/content';
  import Loading from './Loading';
  
  const GOOGLE_SHEET_PROXY_URL = 'http://localhost:8899/device/google-sheet';
  const SYNC_TO_MONGODB_URL = 'http://localhost:8899/device/sync-banks';
  
  const ImportFileComp = ({ devices }) => {
    const [list, setList] = useState([]);
    const [open, setOpen] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [mutate, setMutate] = useState(false);
    const [editData, setEditData] = useState(null);
    const [selectDevice, setSelectDevice] = useState('default');
    const [selectMacro, setSelectMacro] = useState(null);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      let listMacro = [];
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('macro_')) {
          let value = localStorage.getItem(key);
          listMacro.push(JSON.parse(value));
        }
      }
      setList(listMacro);
    }, [mutate]);
  
    const handleMacro = async (type, selected) => {
      if (type === 'remove') {
        const swal = await swalInfoChooseText(`Xóa macro ${selected.title} ?`);
        if (!swal) return;
        localStorage.removeItem(selected.key);
        setMutate((prev) => !prev);
      } else if (type === 'edit') {
        setEditData(selected);
        setOpen((prev) => !prev);
      }
    };
  
    const handleSelectDevice = async (e) => {
      const selected = e.target.value;
      setSelectDevice(selected);
      setOpenModal(false);
  
      setLoading(true);
      const deviceSelect = devices.find((item) => item.id === selected);
      await runMacro(selectMacro, deviceSelect);
      setSelectDevice('default');
      setLoading(false);
    };
  
    const syncFromGoogleSheets = async () => {
      setLoading(true);
      try {
        const res = await fetch(GOOGLE_SHEET_PROXY_URL);
        if (!res.ok) throw new Error('Lỗi kết nối đến Google Sheets');
        const data = await res.json();
  
        localStorage.setItem('local-banks', JSON.stringify(data));
        window.dispatchEvent(new Event('banks-updated'));
        swalToast('success', 'Đồng bộ từ Google Sheets thành công');
        
        await fetch(SYNC_TO_MONGODB_URL);
      } catch (err) {
        console.error('Lỗi khi đồng bộ:', err);
        swalToast('error', 'Không thể đồng bộ từ Google Sheets');
      }
      setLoading(false);
    };
  
    return (
      <>
        <Grid container>
          <Grid item xs={12}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={500} color="#626f86">
                Import
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button size="small" variant="outlined" onClick={syncFromGoogleSheets}>
                  Nhập file .csv
                </Button>
              </Stack>
            </Stack>
          </Grid>
  
          <Grid item xs={12} sx={{ mt: 4 }}>
            <Stack spacing={1}>
              {list.length > 0 &&
                list.map((item, index) => {
                  const actionMap = item.func
                    .map((item) => item.action)
                    .join(', ')
                    .trim()
                    .replace(/,$/, '');
  
                  return (
                    <Stack key={index} direction="row" alignItems="center" justifyContent="space-between">
                      <Card
                        sx={{
                          width: '100%',
                          p: 2,
                          boxShadow: 0,
                          border: `1px solid ${grey[300]}`,
                          transition: 'transform 0.3s, box-shadow 0.3s',
                          '&:hover': {
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                          }
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ width: 26, height: 26, bgcolor: blue[700] }}>{index + 1}</Avatar>
                            <Stack>
                              <Typography fontWeight="bold" color="#172B4D">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="GrayText">
                                {actionMap}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Button
                            variant="outlined"
                            color="success"
                            startIcon={<PlayCircleIcon />}
                            onClick={() => {
                              setSelectMacro(item.func);
                              setOpenModal(true);
                            }}
                          >
                            Chạy Macro
                          </Button>
                        </Stack>
                      </Card>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 1 }}>
                        <Tooltip title="Chỉnh sửa" arrow>
                          <IconButton color="primary" onClick={() => handleMacro('edit', item)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa" arrow>
                          <IconButton color="error" onClick={() => handleMacro('remove', item)}>
                            <BackspaceIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  );
                })}
            </Stack>
          </Grid>
        </Grid>
  
        {loading && <Loading loading={loading} setLoading={setLoading} />}
  
        <CreateMacro open={open} setOpen={setOpen} setMutate={setMutate} editData={editData} setEditData={setEditData} />
  
        <Modal
          open={openModal}
          onClose={() => {
            setOpenModal(false);
            setSelectDevice('default');
          }}
        >
          <Box sx={styleModal}>
            {devices && devices.length > 0 && (
              <FormControl fullWidth>
                <Select value={selectDevice} onChange={handleSelectDevice}>
                  <MenuItem value={'default'}>
                    <Typography color="GrayText">Chọn thiết bị</Typography>
                  </MenuItem>
                  {devices.map((item, index) => (
                    <MenuItem key={index} value={item.id}>
                      {localStorage.getItem(item.id) || item.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Modal>
      </>
    );
  };
  
  export default ImportFileComp;
  
  const styleModal = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4
  };