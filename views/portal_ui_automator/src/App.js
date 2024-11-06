import './App.css';
import { useEffect, useState } from 'react';
import { getListDevice, } from './api/adb';
import { getVersion, postLocalData } from './api/bridge';
import { AddLink, Key, KeyRounded, Link, LinkOff, DeveloperMode } from '@mui/icons-material';
import Loading from './components/Loading';

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import LaunchIcon from '@mui/icons-material/Launch';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import PhonelinkIcon from '@mui/icons-material/Phonelink';
import PhonelinkOffIcon from '@mui/icons-material/PhonelinkOff';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  SettingsInputAntenna,
  Save,
  Edit,
  Cancel,
  Launch,
  PowerSettingsNew,
  Phonelink,
  PhonelinkOff,
  Settings,
  WifiTetheringError,
  WifiTethering
} from '@mui/icons-material';

import { swalToast, swalQuestionConfirm, swalInputText } from './utils/swal';
import { connect, connectTcpIp, disconnectTcpIp, enter, home, typePortKey, typeText } from './services/handle.service';
import { blue } from '@mui/material/colors';
import HandleBidv from './sections/bank_handle/HandleBidv';
import HandleMb from './sections/bank_handle/HandleMb';
import HandleShinhan from './sections/bank_handle/HandleShinhan';
import HandleVietin from './sections/bank_handle/HandleVietin';
import HandleAbb from './sections/bank_handle/HandleAbb';
import HandleVcbNew from './sections/bank_handle/HandleVcbNew';
import { getActionDevice } from './api/device';
import MacroComp from './components/Macro';
import HandleShowQr from './sections/HandleShowQr';
import Swal from 'sweetalert2';
import { getIpPublic, getSetting } from './api/setting';

function App() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mutate, setMutate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [openDial, setOpenDial] = useState(false);
  const [qr, setQr] = useState(false);
  const [seting, setSeting] = useState({});
  const [ipPublic, setIpPublic] = useState(' - ');
  const handleOpenDial = () => {
    setOpenDial(true);
  };

  const handleCloseDial = () => {
    setOpenDial(false);
  };

  useEffect(() => {
    const callAPI = async () => {
      setLoading((prev) => !prev);
      const result = await getListDevice();
      const resultVer = await getVersion();
      const resultSet = await getSetting();
      const resultIp = await getIpPublic()
      setLoading((prev) => !prev);
      if (result.status && result.status === false) {
        return swalToast('error', result.msg);
      }
      setNewVersion(resultVer.version || '');
      setDevices(result);
      setQr(resultSet?.valid);
      setSeting(resultSet?.result || {});
      setIpPublic(resultIp);
    };
    callAPI();
  }, [mutate]);

  const handleDevice = async (type) => {
    setLoading((prev) => !prev);
    const result = await getActionDevice(type);
    setLoading((prev) => !prev);
    if (result.status && result.status === false) {
      return swalToast('error', result.msg);
    }
    swalToast('success', 'Thành công');
    setMutate((prev) => !prev);
  };
  const showDevice = (item, ipPublic) => {
    Swal.fire({
      icon: "info",
      title: "Thông tin thiết bị - " + (localStorage.getItem(item.id) || "Ghi chú"),
      html: `<p>ID: ${item.id}$${ipPublic}</p><p>Name: ${item.nameDevice}</p><p>Model: ${item.model}</p><p>Size: ${item.screenSize}</p>`
    })
  }

  return (
    <>
      <Grid container spacing={2} sx={{ pl: 4, pr: 4, pt: 2 }}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <img src="./logo_att.png" alt="logo" style={{ width: 40, height: 40 }} />
            <Typography variant="h5" fontWeight="bold" color="#172B4D">
              Ui Manual {newVersion || ''}
            </Typography>
            <SetupPusher setMutate={setMutate} seting={seting} />
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Grid>

        <Grid container item xs={12} spacing={3}>
          <Grid item xs={12}>
            <Typography fontWeight={500} color="#626f86">
              Thiết bị
            </Typography>
          </Grid>
          {devices.length === 0 && (
            <Grid item xs={12}>
              <Typography fontWeight="bold" color="#172B4D">
                Không có thiết bị nào được kết nối
              </Typography>
            </Grid>
          )}
          {devices &&
            devices.length > 0 &&
            devices.map((item, index) => {
              const title = localStorage.getItem(item.id) || 'Ghi chú';
              const X = item.screenSize.split('x')[0];
              const Y = item.screenSize.split('x')[1];

              return (
                <Grid key={index} item xs={12} sm={6} md={4} lg={3}>
                  <Card>
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: blue[700] }} title={item.id}                        >
                          {index + 1}
                        </Avatar>
                      }
                      title={<TitleComp title={title} item={item} setMutate={setMutate} />}
                      subheader={
                        <Box>
                          <Typography
                            variant="body"
                            color="Highlight"
                            sx={{ cursor: "pointer", fontWeight: "bold" }}
                            onClick={() => showDevice(item, ipPublic)}
                            title={`${item.nameDevice} - ${item.screenSize}`}>
                            {item.id + "$" + ipPublic}
                          </Typography>
                        </Box>
                      }
                    />
                    <CardContent>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Button
                            fullWidth
                            variant="outlined"
                            fontSize={'11'}
                            color="primary"
                            onClick={() =>
                              typeText({ device_id: item.id }, setLoading)}>
                            Nhập ký tự
                          </Button>
                        </Grid>
                        <Grid item xs={6}>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            fontSize={'11'}
                            onClick={async () => {
                              setLoading(true);
                              await enter({ device_id: item.id });
                              setLoading(false);
                            }}
                          >
                            Enter
                          </Button>
                        </Grid>
                        <Grid item xs={6}>
                          <Tooltip title="Điều khiển/thao tác thiết bị" arrow>
                            <Button
                              variant="outlined"
                              color="secondary"
                              fullWidth
                              fontSize={'11'}
                              onClick={async () => {
                                setLoading(true);
                                await connect({ device_id: item.id, title });
                                setLoading(false);
                              }}
                              startIcon={<LaunchIcon />}
                            >
                              Mở máy
                            </Button>
                          </Tooltip>
                        </Grid>
                        <Grid item xs={6}>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            fontSize={'11'}
                            onClick={async () => {
                              setLoading(true);
                              await home({ device_id: item.id });
                              setLoading(false);
                            }}
                          >
                            Home
                          </Button>
                        </Grid>
                      </Grid>

                      {qr &&
                        <>
                          <Divider sx={{ mt: 2, mb: 2 }} />
                          <HandleShowQr item={item} />
                        </>
                      }
                      <Divider sx={{ mt: 2, mb: 2 }} />
                      <HandleBidv item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleMb item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleShinhan item={item} X={X} Y={Y} setLoading={setLoading} />
                      {/* <HandleVcbOld item={item} X={X} Y={Y} setLoading={setLoading} /> */}
                      <HandleVcbNew item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleVietin item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleAbb item={item} X={X} Y={Y} setLoading={setLoading} />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ borderWidth: 'thin', mt: 2 }} />
        </Grid>
        <Grid item xs={12}>
          <MacroComp devices={devices} />
        </Grid>
      </Grid>

      <SpeedDial
        ariaLabel="SpeedDial openIcon example"
        icon={<SpeedDialIcon openIcon={<SettingsIcon style={{ fontSize: '1.3rem' }} />} />}
        onClose={handleCloseDial}
        onOpen={handleOpenDial}
        open={openDial}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        {actionsDial.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => handleDevice(action.typeHandle)}
          />
        ))}
      </SpeedDial>

      <Loading loading={loading} setLoading={setLoading} />
    </>
  );
}

export default App;

function TitleComp({ title, item, setMutate }) {
  const regexHost = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\:\d{1,5}\b/;

  const [isEdit, setEdit] = useState(false);
  const [textTitle, setTextTitle] = useState(title);

  const saveHandle = () => {
    localStorage.setItem(item.id, textTitle.trim());
    setEdit((prev) => !prev);
    setMutate((prev) => !prev);
  };

  const connectTcpIpHandle = async () => {
    const q = await swalQuestionConfirm('question', 'Kết nối Wifi debug tới thiết bị - ' + item.id, 'Qua Wifi', 'Qua Proxy')
    if (!q) return;

    const conn = await connectTcpIp({ device_id: item.id, type: q });
    if (conn?.status == 200) {
      sessionStorage.setItem(`tcpip-${item.id}`, 'connect');
      window.location.reload()
    }
  };

  const disconnectTcpIpHandle = async () => {
    const q = await swalQuestionConfirm('question', 'Ngắt kết nối Wifi debug tới thiết bị - ' + item.id, 'Xác nhận')
    if (!q) return;

    const conn = await disconnectTcpIp({ device_id: item.id });
    if (conn?.status == 200) {
      sessionStorage.setItem(`tcpip-${item.id}`, 'disconnect');
      window.location.reload()
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        {isEdit ? (
          <>
            <TextField
              variant="outlined"
              placeholder="Ghi chú"
              size="small"
              value={textTitle}
              onChange={(event) => setTextTitle(event.target.value)}
            />
            <Tooltip title="Lưu" arrow>
              <IconButton size="small" onClick={saveHandle}>
                <SaveIcon color="primary" sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Hủy" arrow>
              <IconButton size="small" onClick={() => setEdit((prev) => !prev)}>
                <CancelIcon color="error" sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Typography variant="h6" fontWeight="bold">
              {textTitle}
            </Typography>
            <Stack direction={'row'} justifyContent={'end'}>
              <Tooltip title={"Chỉnh sửa ghi chú"} arrow>
                <IconButton size="small" onClick={() => setEdit((prev) => !prev)}>
                  <EditIcon color="primary" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              {!regexHost.test(item.id) &&
                <Tooltip title={"Kết nối Wifi debug"} arrow>
                  <IconButton size="small" onClick={connectTcpIpHandle}>
                    <AddLink color="primary" sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              }
              {regexHost.test(item.id)
                && <Tooltip title={"Ngắt kết nối Wifi debug"} arrow>
                  <IconButton size="small" onClick={disconnectTcpIpHandle}>
                    <LinkOff color="primary" sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              }
            </Stack>
          </>
        )}
      </Stack >
    </>
  );
}

const actionsDial = [
  { icon: <PhonelinkIcon color="primary" />, name: 'Mở kết nối ngược - VPN điện thoại theo máy tính', typeHandle: 'startShare' },
  { icon: <PhonelinkOffIcon />, name: 'Tắt kết nối ngược', typeHandle: 'stopShare' },
  { icon: <PowerSettingsNewIcon color="error" />, name: 'Restart tool', typeHandle: 'restart' }
];

function SetupPusher({ setMutate, seting }) {
  const [isEdit, setEdit] = useState();
  const [textTitle, setTextTitle] = useState('');

  const saveHandle = async () => {
    setEdit((prev) => !prev);
    setMutate((prev) => !prev);
    const parsedUrl = new URL(textTitle.trim());

    const data = { endpoint: parsedUrl.origin, site: parsedUrl.pathname.replace('/', '') }

    const result = await postLocalData(data);

    if (result?.valid == true) {
      return swalToast('success', 'Thành công');
    } else {
      return swalToast('error', "Lỗi hệ thống");
    }
  };


  const SetupConnectIP = async () => {
    const q = await swalInputText('Kết nối tới thiết bị qua IP', '', 'Địa chỉ IP');
    if (!q) return;

    const conn = await connectTcpIp({ device_id: q, type: 'tailscale' });
    if (conn?.valid == true) {
      return swalToast('success', 'Thành công');
    } else {
      return swalToast('error', "Lỗi hệ thống");
    }
  };
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        {isEdit ? (
          <>
            <TextField
              variant="outlined"
              placeholder="Link truy cập"
              size="small"
              sx={{ width: "180px" }}
              value={textTitle}
              onChange={(event) => setTextTitle(event.target.value)}
            />
            <Tooltip title="Lưu">
              <IconButton size="small" onClick={saveHandle}>
                <SaveIcon color="primary" sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Hủy" arrow>
              <IconButton size="small" onClick={() => setEdit((prev) => !prev)}>
                <CancelIcon color="error" sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={(seting?.endpoint && seting?.message) ? seting.message : 'Cấu hình link truy cập'} arrow>
              <IconButton size="small" onClick={() => setEdit((prev) => !prev)}>
                {(seting?.endpoint && seting?.connected) && <WifiTethering color={"primary"} sx={{ fontSize: 20 }} />}
                {(!seting?.endpoint || !seting?.connected) && <WifiTetheringError color={"gray"} sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Tooltip title="Cấu hình link truy cập" arrow>
          <IconButton size="small" onClick={SetupConnectIP}>
            <DeveloperMode color={"primary"} sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Stack >
    </>
  );
}
