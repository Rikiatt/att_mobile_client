import './App.css';
import { useEffect, useState } from 'react';
import { getListDevice, } from './api/adb';
import { connectEndpoint, getVersion, postLocalData } from './api/bridge';
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
  FormControlLabel,
  Grid,
  IconButton,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

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

import { swalToast, swalQuestionConfirm, swalInputText, swalInfoChooseText, swalQuestionConfirms } from './utils/swal';
import { connect, connectTcpIp, disconnectTcpIp, enter, home, delImg, typePortKey, typeText } from './services/handle.service';
import { blue } from '@mui/material/colors';
import HandleOCB from './sections/bank_handle/HandleOCB';
import HandleBIDV from './sections/bank_handle/HandleBIDV';
import HandleMB from './sections/bank_handle/HandleMB';
import HandleVCB from './sections/bank_handle/HandleVCB';
import HandleVietin from './sections/bank_handle/HandleVietin';
import HandleSHB from './sections/bank_handle/HandleSHB';
// import HandleABB from './sections/bank_handle/HandleABB';
// import HandleShinhan from './sections/bank_handle/HandleShinhan';
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
  const showDevice = (item) => {
    Swal.fire({
      icon: "info",
      title: "Thông tin thiết bị - " + (localStorage.getItem(item.id) || "Ghi chú"),
      html: `<p>ID: ${item.id}</p><p>Name: ${item.nameDevice}</p><p>Model: ${item.model}</p><p>Size: ${item.screenSize}</p>`
    })
  }

  return (
    <>
      <Grid container spacing={2} sx={{ pl: 4, pr: 4, pt: 2 }}>
        <Grid item xs={12}>
          <Stack direction="row" alignItems="center" spacing={2} justifyContent={"space-between"}>
            <Stack direction="row" alignItems="center" spacing={2} justifyContent={"space-between"}>
              <img src="./logo_att.png" alt="logo" style={{ width: 40, height: 40 }} />
              <Typography variant="h5" fontWeight="bold" color="#172B4D">
                ATT Mobile Client {newVersion || ''}
              </Typography>
              <SetupIP setMutate={setMutate} />
              <Typography variant="button" fontWeight="bold" color="#172B4D">IP: {ipPublic}</Typography>
            </Stack>
            <SetupConnect setMutate={setMutate} seting={seting} setSeting={setSeting} />
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
                            onClick={() => showDevice(item)}
                            title={`${item.nameDevice} - ${item.screenSize}`}>
                            {item.id}
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
                              startIcon={<Launch />}
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
                              await delImg({ device_id: item.id });
                              setLoading(false);
                            }}
                          >
                            Xóa ảnh
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
                      <HandleOCB item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleBIDV item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleMB item={item} X={X} Y={Y} setLoading={setLoading} />
                      {/* <HandleVcbOld item={item} X={X} Y={Y} setLoading={setLoading} /> */}
                      <HandleVCB item={item} X={X} Y={Y} setLoading={setLoading} />                      
                      <HandleVietin item={item} X={X} Y={Y} setLoading={setLoading} />
                      <HandleSHB item={item} X={X} Y={Y} setLoading={setLoading} />
                      {/* <HandleABB item={item} X={X} Y={Y} setLoading={setLoading} /> */}
                      {/* <HandleShinhan item={item} X={X} Y={Y} setLoading={setLoading} /> */}
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
        icon={<SpeedDialIcon openIcon={<Settings style={{ fontSize: '1.3rem' }} />} />}
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
              <Save color="primary" sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hủy" arrow>
            <IconButton size="small" onClick={() => setEdit((prev) => !prev)}>
              <Cancel color="error" sx={{ fontSize: 18 }} />
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
                <Edit color="primary" sx={{ fontSize: 16 }} />
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
    </Stack>
  );
}

const actionsDial = [
  { icon: <Phonelink color="primary" />, name: 'Mở kết nối ngược - VPN điện thoại theo máy tính', typeHandle: 'startShare' },
  { icon: <PhonelinkOff />, name: 'Tắt kết nối ngược', typeHandle: 'stopShare' },
  { icon: <PowerSettingsNew color="error" />, name: 'Restart tool', typeHandle: 'restart' }
];

function SetupConnect({ setMutate, seting, setSeting }) {
  let att_connect = seting.att?.connected || false;
  let org_connect = seting.org?.connected || false;

  const handleEndpoint = async (type) => {
    const endpoint = await swalInputText('Cập nhật Url cho '
      + type.toUpperCase(), type == 'att'
      ? 'URL có dạng (https://de****.att****.net/ui_manual/connect/ + tên đài)'
      : 'URL có dạng: (https://de****.att***.org/ + tên đài)', 'Url truy cập ... ');
    if (endpoint) {
      const parsedUrl = new URL(endpoint.trim());
      const data = { [type]: { endpoint: parsedUrl.origin, site: parsedUrl.pathname.replace('/', '') } };
      setMutate((prev) => !prev);
      const result = await postLocalData(data);
      if (result?.valid == true) {
        return swalToast('success', 'Thành công');
      } else {
        return swalToast('error', "Lỗi hệ thống");
      }
    }
  }

  const handleConnect = async (type, disconnect) => {
    if (disconnect) {
      const result = await swalInfoChooseText('Ngắt kết nối ' + type.toUpperCase());
      if (result) {
        const data = { type, disconnect };
        const result = await connectEndpoint(data);
        if (result?.valid == true) {
          return swalToast('success', 'Thành công');
        } else {
          return swalToast('error', "Lỗi hệ thống");
        }
      }
    } else {
      const acction = await swalQuestionConfirms('warning', 'Thao tác kết nối', 'Thay Url ' + type.toUpperCase(), 'Kết nối ' + type.toUpperCase(), 'Hủy');

      if (acction) {
        if (acction == 'confirm') { return handleEndpoint(type) };
        const data = { type, disconnect };
        const result = await connectEndpoint(data);
        if (result?.valid == true) {
          setSeting((pre) => ({ ...pre, connect: type, [type]: { ...pre[type], connected: !disconnect } }))
          return swalToast('success', 'Thành công');
        } else {
          setSeting((pre) => ({ ...pre, connect: '', att: { ...pre.att, connected: false }, org: { ...pre.org, connected: false } }))
          return swalToast('error', "Lỗi hệ thống");
        }
      }

    }
  }
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <FormControlLabel sx={{
        background: seting.connect == 'org' ? (seting.org.connected == true ? '#5ced5c' : 'red') : 'unset',
        p: "0 8px",
        borderRadius: 12,
        boxShadow: "rgba(50, 50, 93, 0.25) 0px 30px 60px - 12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset"
      }} control={
        !seting.org
          ? (<Tooltip title="ORG - Cấu hình link truy cập" arrow>
            <IconButton size="small" onClick={() => handleEndpoint('org')}>
              <WifiTetheringError color={"primary"} sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>)
          : (seting.org?.endpoint
            ? <Switch color="primary" checked={org_connect} onChange={() => handleConnect('org', org_connect)} />
            : <Tooltip title="ORG - Cấu hình link truy cập" arrow>
              <IconButton size="small" onClick={() => handleEndpoint('org')}>
                <WifiTetheringError color={"primary"} sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>)
      } label="ORG" labelPlacement="start" />
      <FormControlLabel sx={{
        background: seting.connect == 'att' ? (seting.att.connected ? '#5ced5c' : 'red') : 'unset',
        p: "0 8px",
        borderRadius: 12,
        boxShadow: "rgba(50, 50, 93, 0.25) 0px 30px 60px - 12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset"
      }} control={
        !seting.att
          ? (<Tooltip title="ATTPAY+ - Cấu hình link truy cập" arrow>
            <IconButton size="small" onClick={() => handleEndpoint('att')}>
              <WifiTetheringError color={"primary"} sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>)
          : (seting.att?.endpoint
            ? <Switch color="primary" checked={att_connect} onChange={() => handleConnect('att', att_connect)} />
            : <Tooltip title="ATTPAY+ - Cấu hình link truy cập" arrow>
              <IconButton size="small" onClick={() => handleEndpoint('att')}>
                <WifiTetheringError color={"primary"} sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>)
      } label="ATTPAY+" labelPlacement="start" />
    </Stack>
  );
}

function SetupIP({ setMutate }) {
  const SetupConnectIP = async () => {
    const q = await swalInputText('Kết nối tới thiết bị qua IP', '', 'Địa chỉ IP');
    if (!q) return;
    setMutate((prev) => !prev);
    const conn = await connectTcpIp({ device_id: q, type: 'tailscale' });
    if (conn?.valid == true) {
      return swalToast('success', 'Thành công');
    } else {
      return swalToast('error', "Lỗi hệ thống");
    }
  };
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Tooltip title="Cấu hình link truy cập" arrow>
        <IconButton size="small" onClick={SetupConnectIP}>
          <DeveloperMode color={"primary"} sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
    </Stack >
  );
}