require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const deviceHelper = require('../helpers/deviceHelper');
const { delay } = require('../helpers/functionHelper');
const fs = require('fs');
const { pipeline } = require("stream/promises");

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const { sendTelegramAlert, saveAlertToDatabase } = require('../functions/alert.function');
let chatId = process.env.CHATID; // mặc định là gửi vào nhóm Warning - Semi Automated Transfer
const telegramToken = process.env.TELEGRAM_TOKEN;
const filePath = 'C:\\att_mobile_client\\database\\localdata.json';
const fileContent = fs.readFileSync(filePath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const siteOrg = jsonData?.org?.site || '';
const siteAtt = jsonData?.att?.site?.split('/').pop() || '';

const validSite = siteOrg || siteAtt;
const notifier = require('../events/notifier');

const siteToChatIdMap = {
  'shbet': process.env.CHATID_SHBET,
  'new88': process.env.CHATID_NEW88,
  'jun88cmd': process.env.CHATID_JUN88CMD,
  'jun88k36': process.env.CHATID_JUN88K36        
};

if (siteToChatIdMap[validSite]) {
  chatId = siteToChatIdMap[validSite];
}

const coordinatessSemiAuto = require('../config/coordinatessSemiAuto.json');
const { checkContentABB, checkContentACB, checkContentBAB, checkContentBIDV, checkContentEIB, checkContentHDB, checkContentICB, checkContentNCB, checkContentOCB, checkContentNAB, checkContentSHB, checkContentSHBVN, checkContentTPB, checkContentVIETBANK, checkContentVIKKI, checkContentVPB, checkContentMB, checkContentMSB, checkContentPVCB, checkContentSEAB, checkContentSTB, checkContentTCB, checkContentVCB, checkContentVIB, 
  stopABB, stopACB, stopBIDV, stopVCB, stopVIB, stopEIB, stopHDB, stopICB, stopLPBANK, stopMB, stopMSB, stopNAB, stopNCB, stopOCB, stopSEAB, stopSHBSAHA, stopSHBVN, stopPVCB, stopSTB, stopTCB, stopTPB, stopVPB
} 
= require('../functions/checkBank.function');
const { Logger } = require('../config/require.config');
const { run } = require('node-cmd');

async function clearTempFile( { device_id } ) {
  try {                
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);    
  } catch (error) {
    console.error("Cannot delete file temp_dump.xml:", error.message);
  }
}

async function waitForXmlReady(device_id, remotePath = '/sdcard/temp_dump.xml', timeout = 3000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const output = await client.shell(device_id, `ls ${remotePath}`)
        .then(adb.util.readAll)
        .then(buf => buf.toString().trim());

      if (output === remotePath) return true;
    } catch (_) { // ignore spam log
      // file chưa tồn tại, tiếp tục vòng lặp
    }
    await delay(200); // không nên để thấp hơn 200ms để tránh spam shell
  }
  return false;
}

async function dumpXmlToLocal(device_id, localPath) {
  try {
    const remotePath = `/sdcard/temp_dump.xml`;
    await client.shell(device_id, `uiautomator dump ${remotePath}`);

    const ready = await waitForXmlReady(device_id, remotePath);
    if (!ready) throw new Error('XML file not ready after dump');

    const transfer = await client.pull(device_id, remotePath);
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(localPath);
      transfer.pipe(fileStream);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  } catch (error) {
    console.error(`dumpXmlToLocal error: ${error.message}`);
  }
}

async function dumpOCRToLocal(device_id, localPath) {
  try {
    const screencapStream = await client.shell(device_id, `screencap -p`);

    await pipeline(
      screencapStream,
      fs.createWriteStream(localPath)
    );
    
    Logger.log(0, `Screenshot saved to: ${localPath}`, __filename);
  } catch (error) {
    Logger.log(2, `dumpOCRToLocal error: ${error.message}`, __filename);
  }
}

async function getCurrentForegroundApp({ device_id }) {
  try {
    const output = await client.shell(device_id, `dumpsys activity activities | grep mResumedActivity`)
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());

    const match = output.match(/u0\s+([^\s\/]+)\//);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("Error getting current foreground app:", error.message);
    return null;
  }
}

// ok
async function trackABB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);  
  Logger.log(0, 'Đang theo dõi ABB...', __filename);

  let running = await isABBRunning( { device_id } );  

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {  
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'abb' ) {      
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là ABB nhưng QR yêu cầu bank khác (${qrBank}), stop ABB.`
      });

      await stopABB({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là ABB nhưng QR yêu cầu bank khác (${qrBank}), stop ABB. (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      // await dumpXmlToLocal(device_id, localPath);
      await checkContentABB(device_id, localPath);
    }

    running = await isABBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isABBRunning vẫn true, tiếp tục theo dõi
      if (!running) {        
        Logger.log(0, 'ABB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.abbank.retail') {      
      Logger.log(0, `ABB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {      
      Logger.log(0, 'ABB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// ok
async function trackACB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi ACB...', __filename);
  // Click "CLOSE" to close UTILITIES SETTING
  // await client.shell(device_id, 'input tap 540 900');      
  await client.shell(device_id, 'input tap 787 1242');  

  let running = await isACBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'acb' ) {      
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là ACB nhưng QR yêu cầu bank khác (${qrBank}), stop ACB.`
      });   

      await stopACB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là ACB nhưng QR yêu cầu bank khác (${qrBank}), stop ACB. (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentACB(device_id, localPath);
    }

    running = await isACBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isACBRunning vẫn true, tiếp tục theo dõi
      if (!running) {        
        Logger.log(0, 'ACB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'mobile.acb.com.vn') {
      Logger.log(0, `ACB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'ACB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

// ok
async function trackEIB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  Logger.log(0, 'Đang theo dõi EIB...', __filename);

  let running = await isEIBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'eib' ) {      
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là EIB nhưng QR yêu cầu bank khác (${qrBank}), stop EIB.`
      });

      await stopEIB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là EIB nhưng QR yêu cầu bank khác (${qrBank}), stop EIB. (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });   

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentEIB(device_id, localPath);
    }

    running = await isEIBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isEIBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'EIB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.EximBankOmni') {
      Logger.log(0, `EIB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'EIB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

// ok
async function trackHDB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi HDB...', __filename);

  let running = await isHDBRunning( { device_id } );  

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {    
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    // Check send.bank nếu là org hoặc att (test bỏ qua)
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'hdb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là HDB nhưng QR yêu cầu bank khác (${qrBank}), stop HDB.`
      });      

      await stopHDB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là HDB nhưng QR yêu cầu bank khác (${qrBank}), stop HDB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentHDB(device_id, localPath);
    }    

    running = await isHDBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isHDBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'HDB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.hdbank') {
      Logger.log(0, `HDB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      Logger.log(0, 'HDB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// ok
async function trackOCB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  Logger.log(0, 'Đang theo dõi OCB...', __filename);

  let running = await isOCBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'ocb' ) {      
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là OCB nhưng QR yêu cầu bank khác (${qrBank}), stop OCB.`
      });   

      await stopOCB({ device_id });          

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là OCB nhưng QR yêu cầu bank khác (${qrBank}), stop OCB. (id: ${device_id})`        
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentOCB(device_id, localPath);
    }
  
    running = await isOCBRunning({ device_id });
  
    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isOCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'OCB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.ocb.awe') {
      Logger.log(0, `OCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  
    if (!running) {
      Logger.log(0, 'OCB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

// chua lam checkContentNCB
async function trackNCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi NCB...', __filename);

  let running = await isNCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'ncb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là NCB nhưng QR yêu cầu bank khác (${qrBank}), stop NCB.`
      });      

      await stopNCB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là NCB nhưng QR yêu cầu bank khác (${qrBank}), stop NCB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentNCB(device_id, localPath);
    }    

    running = await isNCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isNCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'NCB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.ncb.bank') {
      Logger.log(0, `NCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      Logger.log(0, 'NCB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

 async function trackNAB ( { device_id } ) {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);
    Logger.log(0, 'Đang theo dõi NAB...', __filename);
    let running = await isNABRunning( { device_id } );

    if (!running) {
      return await trackingLoop({ device_id });
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';
      if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'nab' ) {      
        // Phát thông báo realtime
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Bank đang chạy là NAB nhưng QR yêu cầu bank khác (${qrBank}), stop NAB.`
        });
                
        await stopNAB({ device_id });                 

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `Bank đang chạy là NAB nhưng QR yêu cầu bank khác (${qrBank}), stop NAB. (id: ${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
          filePath: ".xml"
        });

        return await trackingLoop({ device_id });
      } 
      else {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);

        await dumpXmlToLocal(device_id, localPath);
        await checkContentNAB(device_id, localPath);
      }
  
      running = await isNABRunning({ device_id });
  
      const currentApp = await getCurrentForegroundApp({ device_id });
      if (currentApp === null) {      
        // Nếu isNABRunning vẫn true, tiếp tục theo dõi
        if (!running) {
          Logger.log(0, 'NAB process đã tắt. Dừng theo dõi.', __filename);
          await clearTempFile({ device_id });
          return await trackingLoop({ device_id });
        }
        // Nếu vẫn chạy, tiếp tục bình thường
      } else if (currentApp !== 'ops.namabank.com.vn') {
        Logger.log(0, `NAB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
  
      if (!running) {
        Logger.log(0, 'NAB đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
    }
    return { status: 200, message: 'Success' };
}

async function trackSHBSAHA ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi SHB SAHA...', __filename);

  let running = await isSHBSAHARunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'shb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là SHB nhưng QR yêu cầu bank khác (${qrBank}), stop SHB.`
      });

      await stopSHBSAHA({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là SHB SAHA nhưng QR yêu cầu bank khác (${qrBank}), stop SHB SAHA. (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentSHB(device_id, localPath);
    }

    running = await isSHBSAHARunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isSHBSAHARunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'SHB SAHA process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.shb.saha.mbanking') {
      Logger.log(0, `SHB SAHA không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'SHB SAHA đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackSHBVN ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi SHBVN...', __filename);

  let running = await isSHBVNRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'shbvn' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là SHBVN nhưng QR yêu cầu bank khác (${qrBank}), stop SHBVN.`
      });

      await stopSHBVN({ device_id });

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là SHBVN nhưng QR yêu cầu bank khác (${qrBank}), stop SHBVN. (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentSHBVN(device_id, localPath);
    }

    running = await isSHBVNRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {
      // Nếu isSHBVNRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'SHBVN process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.shinhan.global.vn.bank') {
      Logger.log(0, `SHBVN không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'SHBVN đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackTPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi TPB...', __filename);  
  let running = await isTPBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'tpb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là TPB nhưng QR yêu cầu bank khác (${qrBank}), stop TPB.`
      }); 

      await stopTPB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là TPB nhưng QR yêu cầu bank khác (${qrBank}), stop TPB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      // await checkContentTPB(device_id, localPath);
    }

    running = await isTPBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isTPBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'TPB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.tpb.mb.gprsandroid') {
      Logger.log(0, `TPB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'TPB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

// checkContentVIETBANK: 50%
async function trackVIETBANK({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi VIETBANK...', __filename);

  let running = await isVIETBANKRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'com.vnpay.vietbank' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VIETBANK nhưng QR yêu cầu bank khác (${qrBank}), stop VIETBANK.`
      });      

      await stopVIETBANK({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là VIETBANK nhưng QR yêu cầu bank khác (${qrBank}), stop VIETBANK (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentVIETBANK(device_id, localPath);
    }    

    running = await isVIETBANKRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isVIETBANKRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'VIETBANK process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.vietbank') {
      Logger.log(0, `VIETBANK không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      Logger.log(0, 'VIETBANK đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackVPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  Logger.log(0, 'Đang theo dõi VPB...', __filename);

  let running = await isVPBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'vpb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VPB nhưng QR yêu cầu bank khác (${qrBank}), stop VPB.`
      }); 

      await stopVPB({ device_id });

      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VPB nhưng QR yêu cầu bank khác (${qrBank}), stop VPB.`
      });

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là VPB nhưng QR yêu cầu bank khác (${qrBank}), stop VPB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      // await dumpXmlToLocal(device_id, localPath);
      await checkContentVPB(device_id, localPath);
    }

    running = await isVPBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVPBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'VPB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.vpbankonline') {
      Logger.log(0, `VPB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'VPB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackMB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  Logger.log(0, 'Đang theo dõi MB Bank...', __filename);

  let running = await isMBRunning({ device_id });

  if (!running) {
    return await trackingLoop({ device_id });
  }

  await clearTempFile({ device_id });

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || ''; 
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'mb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là MB nhưng QR yêu cầu bank khác (${qrBank}), stop MB.`
      });  
          
      await stopMB({ device_id });   

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là MB nhưng QR yêu cầu bank khác (${qrBank}), stop MB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentMB(device_id, localPath);
    }

    running = await isMBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isMBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'MB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.mbmobile') {
      Logger.log(0, `MB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'MB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// dang lam checkContentBAB
async function trackBAB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi BAB...', __filename);

  let running = await isBABRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'bab' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là BAB nhưng QR yêu cầu bank khác (${qrBank}), stop BAB.`
      });      

      await stopBAB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là BAB nhưng QR yêu cầu bank khác (${qrBank}), stop BAB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentBAB(device_id, localPath);
    }    

    running = await isBABRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isBABRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'BAB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.bab.retailUAT') {
      Logger.log(0, `BAB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      Logger.log(0, 'BAB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentBIDV
async function trackBIDV({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi BIDV...', __filename);

  let running = await isBIDVRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'bidv' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là BIDV nhưng QR yêu cầu bank khác (${qrBank}), stop BIDV.`
      });      

      await stopBIDV({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là BIDV nhưng QR yêu cầu bank khác (${qrBank}), stop BIDV (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentBIDV(device_id, localPath);
    }    

    running = await isBIDVRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isBIDVRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'BIDV process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.bidv') {
      Logger.log(0, `BIDV không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      Logger.log(0, 'BIDV đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentVCB
async function trackVCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi VCB...', __filename);

  let running = await isVCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'vcb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VCB nhưng QR yêu cầu bank khác (${qrBank}), stop VCB.`
      });      
      await stopVCB({ device_id });      

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là VCB nhưng QR yêu cầu bank khác (${qrBank}), stop VCB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentVCB(device_id, localPath);
    }    

    running = await isVCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'VCB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.VCB') {
      Logger.log(0, `VCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'VCB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentVIB
async function trackVIB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi VIB...', __filename);

  let running = await isVIBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'vib' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VIB nhưng QR yêu cầu bank khác (${qrBank}), stop VIB.`
      });

      await stopVIB({ device_id });   

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là VIB nhưng QR yêu cầu bank khác (${qrBank}), stop VIB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentVIB(device_id, localPath);
    }    

    running = await isVIBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'VIB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vib.myvib2') {
      Logger.log(0, `VIB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'VIB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackVIKKI({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'Đang theo dõi VIKKI...', __filename);

  let running = await isVIKKIRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'vikki' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là VIKKI nhưng QR yêu cầu bank khác (${qrBank}), stop VIKKI.`
      });

      await stopVIKKI({ device_id });   

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là VIKKI nhưng QR yêu cầu bank khác (${qrBank}), stop VIKKI (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentVIKKI(device_id, localPath);
    }    

    running = await isVIKKIRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVIKKIRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'VIKKI process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.finx.vikki') { // chua lam
      Logger.log(0, `VIKKI không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'VIKKI đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentSEAB
async function trackSEAB({ device_id }) {      
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi SEAB...', __filename);

  let running = await isSEABRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) { 
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'seab' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là SEAB nhưng QR yêu cầu bank khác (${qrBank}), stop SEAB.`
      });

      await stopSEAB({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là SEAB nhưng QR yêu cầu bank khác (${qrBank}), stop SEAB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentSEAB(device_id, localPath);
    }

    running = await isSEABRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isSEABRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'SEAB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.seabank.mb1') {
      Logger.log(0, `SEAB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'SEAB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentICB
async function trackICB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi ICB...', __filename);

  let running = await isICBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) { 
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';  
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'icb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là ICB nhưng QR yêu cầu bank khác (${qrBank}), stop ICB.`
      });

      await stopICB({ device_id });    

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là ICB nhưng QR yêu cầu bank khác (${qrBank}), stop ICB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentICB(device_id, localPath);
    }

    running = await isICBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isICBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'ICB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vietinbank.ipay') {
      Logger.log(0, `ICB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'ICB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentPVCB
async function trackPVCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'PVCB không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...', __filename);

  let running = await isPVCBRunning( { device_id } );
  console.log('log running in trackPVCB:', running);

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'pvcb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là PVCB nhưng QR yêu cầu bank khác (${qrBank}), stop PVCB.`
      });

      await stopPVCB({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là PVCB nhưng QR yêu cầu bank khác (${qrBank}), stop PVCB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentPVCB(device_id, localPath);
    }

    running = await isPVCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isPVCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'PVCB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.pvcombank.retail') {
      Logger.log(0, `PVCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'PVCB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentLPBANK
async function trackLPBANK({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'LPBANK không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...', __filename);

  let running = await isLPBANKRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) { 
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'lpbank' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là LPBANK nhưng QR yêu cầu bank khác (${qrBank}), stop LPBANK.`
      });

      await stopLPBANK({ device_id });   

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là LPBANK nhưng QR yêu cầu bank khác (${qrBank}), stop LPBANK (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentLPBANK(device_id, localPath);
    }

    running = await isLPBANKRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isLPBANKRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'LPBANK process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.lpb.lienviet24h') {
      Logger.log(0, `LPBANK không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'LPBANK đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentMSB
async function trackMSB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(1, 'MSB không cho phép dump màn hình nên không hỗ trợ theo dõi...', __filename);

  let running = await isMSBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {       
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'msb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là MSB nhưng QR yêu cầu bank khác (${qrBank}), stop MSB.`
      });

      await stopMSB({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là MSB nhưng QR yêu cầu bank khác (${qrBank}), stop MSB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      // await dumpXmlToLocal(device_id, localPath);
      await checkContentMSB(device_id, localPath);
    }

    running = await isMSBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isMSBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'MSB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.msb.mobileBanking.corp') {
      Logger.log(0, `MSB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'MSB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// checkContentSTB - 50%
async function trackSTB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi Sacom...', __filename);

  let running = await isSTBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) { 
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'stb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là STB nhưng QR yêu cầu bank khác (${qrBank}), stop STB.`
      });

      await stopSTB({ device_id });  

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là STB nhưng QR yêu cầu bank khác (${qrBank}), stop STB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal(device_id, localPath);
      await checkContentSTB(device_id, localPath);
    }

    running = await isSTBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isSTBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'STB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.sacombank.ewallet') {
      Logger.log(0, `STB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'STB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

// chua lam checkContentTCB
async function trackTCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  Logger.log(0, 'Đang theo dõi TCB...', __filename);

  let running = await isTCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
    const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
    const qrDevice = infoQR?.data?.device_id || '';
    const qrType = infoQR?.type || '';
    if ( device_id === qrDevice && (qrType === 'org' || qrType === 'att') && qrBank !== 'tcb' ) {      
      // Phát thông báo realtime
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Bank đang chạy là TCB nhưng QR yêu cầu bank khác (${qrBank}), stop TCB.`
      });

      await stopTCB({ device_id }); 

      await sendTelegramAlert(
        telegramToken,
        chatId,
        `Bank đang chạy là TCB nhưng QR yêu cầu bank khác (${qrBank}), stop TCB (id: ${device_id})`
      );

      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        filePath: ".xml"
      });

      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      // await dumpXmlToLocal(device_id, localPath);
      await checkContentTCB(device_id, localPath);
    }

    running = await isTCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isTCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        Logger.log(0, 'TCB process đã tắt. Dừng theo dõi.', __filename);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.techcombank.bb.app') {
      Logger.log(0, `TCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`, __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      Logger.log(0, 'TCB đã tắt. Dừng theo dõi.', __filename);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

const trackFunctions = {
  ABB: trackABB,
  ACB: trackACB,
  BAB: trackBAB,
  BIDV: trackBIDV,
  EIB: trackEIB,
  HDB: trackHDB,
  ICB: trackICB,
  LPBANK: trackLPBANK,
  MB: trackMB,
  MSB: trackMSB,
  NAB: trackNAB,
  NCB: trackNCB,
  OCB: trackOCB,
  PVCB: trackPVCB,
  SEAB: trackSEAB,
  SHB: trackSHBSAHA,
  SHBVN: trackSHBVN,
  STB: trackSTB,
  TCB: trackTCB,
  TPB: trackTPB,
  VCB: trackVCB,
  VIETBANK: trackVIETBANK,
  VIB: trackVIB,  
  VIKKI: trackVIKKI,
  VPB: trackVPB
};

async function trackingLoop({ device_id }) {
  while (true) {    
    const bankName = await checkRunningBanks({ device_id });      

    if (bankName) {
      const trackFunction = trackFunctions[bankName];

      if (trackFunction) {
        Logger.log(0, `Đang theo dõi ${bankName}...`, __filename);
        await trackFunction({ device_id });
      } 
      break; // break loop nếu theo dõi được app hợp lệ
    } else {
      Logger.log(0, 'Đang chờ user mở đúng 1 app ngân hàng...', __filename);
      await delay(2000);
    }
  }
}

async function checkDeviceSemiAuto({ device_id }) {
  try {
    const deviceModel = await deviceHelper.getDeviceModel(device_id);      

    const deviceCoordinates = coordinatessSemiAuto[deviceModel];             
    
    if (deviceCoordinates == undefined) {                
      return { status: 500, valid: false, message: 'Không thể xuất bán tự động' };    
    }

    return deviceCoordinates;
  } catch (error) {
    console.error(`Error checking device: ${error.message}`);
    throw error;
  }
}

async function isACBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'mobile.acb.com.vn';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking ACB app status via activity stack:", error.message);
    return false;
  }
}

async function isBABRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.bab.retailUAT';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking BAB app status via activity stack:", error.message);
    return false;
  }
}

async function isEIBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vnpay.EximBankOmni';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking EIB app status via activity stack:", error.message);
    return false;
  }
}

async function isOCBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.com.ocb.awe';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking OCB app status via activity stack:", error.message);
    return false;
  }
}

async function isNCBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.ncb.bank';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking NCB app status via activity stack:", error.message);
    return false;
  }
}

async function isNABRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'ops.namabank.com.vn';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking NAB app status via activity stack:", error.message);
    return false;
  }
}

async function isPVCBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    console.log('log in isPVCBRunning');

    const packageName = 'com.pvcombank.retail';
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);

    if (isForeground) return true;

    const escaped = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escaped}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escaped}`).test(output);

    return isInTaskList;
  } catch (error) {
    console.error("Error checking PVCB app status via activity stack:", error.message);
    return false;
  }
}

async function isTPBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.tpb.mb.gprsandroid';

    // 1. App đang ở trạng thái foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. App đang background (có trong task/activity record)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. App không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking TPB app status via activity stack:", error.message);
    return false;
  }
}

async function isVPBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vnpay.vpbankonline';

    // 1. Kiểm tra nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app đang background (vẫn có trong task/activity stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking VPB app status via activity stack:", error.message);
    return false;
  }
}

async function isMBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.mbmobile';

    // 1. Kiểm tra foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (còn tồn tại trong task stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking MB app status via activity stack:", error.message);
    return false;
  }
}

async function isBIDVRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vnpay.bidv';

    // 1. Kiểm tra nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app đang background (vẫn có trong task/activity stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking BIDV app status via activity stack:", error.message);
    return false;
  }
}

async function isHDBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    // 1. Check foreground (resumed)
    const isForeground = output.includes('mResumedActivity') && output.includes('com.vnpay.hdbank');
    if (isForeground) return true;

    // 2. Check background (still exists in task list)
    const isInTaskList = /ActivityRecord\{.*com\.vnpay\.hdbank/.test(output) || /TaskRecord\{.*com\.vnpay\.hdbank/.test(output);
    if (isInTaskList) return true;

    // 3. Not running
    return false;

  } catch (error) {
    console.error("Error checking HDB app status via activity stack:", error.message);
    return false;
  }
}

async function isVCBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.VCB';

    // 1. Check foreground (mResumedActivity)
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Check background (TaskRecord hoặc ActivityRecord có app)
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${packageName.replace(/\./g, '\\.')}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${packageName.replace(/\./g, '\\.')}`).test(output);
    if (isInTaskList) return true;

    // 3. App không chạy
    return false;

  } catch (error) {
    console.error("Error checking VCB app status via activity stack:", error.message);
    return false;
  }
}

async function isVIKKIRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    // 1. Check if app is in foreground (resumed)
    const isForeground = output.includes('mResumedActivity') && output.includes('com.finx.vikki');
    if (isForeground) return true;

    // 2. Check if app is in background (exists in task or activity records)
    const isInTaskList =
      /ActivityRecord\{.*com\.finx\.vikki/.test(output) ||
      /TaskRecord\{.*com\.finx\.vikki/.test(output);
    if (isInTaskList) return true;

    // 3. App is not running
    return false;

  } catch (error) {
    console.error("Error checking VIKKI app status via activity stack:", error.message);
    return false;
  }
}

async function isVIETBANKRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vnpay.vietbank';

    // 1. Kiểm tra foreground (RESUMED)
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (vẫn còn trong task stack)
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${packageName.replace(/\./g, '\\.')}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${packageName.replace(/\./g, '\\.')}`).test(output);
    if (isInTaskList) return true;

    // 3. Không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking VIETBANK app status via activity stack:", error.message);
    return false;
  }
}

async function isVIBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vib.myvib2';

    // 1. Kiểm tra foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (task hoặc activity records)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking VIB app status via activity stack:", error.message);
    return false;
  }
}

async function isSEABRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.com.seabank.mb1';

    // 1. Check nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Check nếu app đang background (còn trong task stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. App đã bị kill
    return false;

  } catch (error) {
    console.error("Error checking SEAB app status via activity stack:", error.message);
    return false;
  }
}

async function isSHBSAHARunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.shb.saha.mbanking';

    // 1. Kiểm tra foreground (mResumedActivity)
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (TaskRecord hoặc ActivityRecord)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking SHB SAHA app status via activity stack:", error.message);
    return false;
  }
}

async function isSHBVNRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.shinhan.global.vn.bank';

    // 1. Kiểm tra foreground (mResumedActivity)
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (TaskRecord hoặc ActivityRecord)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking SHBVN app status via activity stack:", error.message);
    return false;
  }
}

async function isICBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.vietinbank.ipay';

    // 1. Kiểm tra foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra background (còn trong task stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking ICB app status via activity stack:", error.message);
    return false;
  }
}

async function isLPBANKRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.com.lpb.lienviet24h';

    // 1. Check nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Check nếu app đang background (vẫn có mặt trong task/activity stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. App không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking LPBANK app status via activity stack:", error.message);
    return false;
  }
}

async function isABBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.abbank.retail';

    // 1. Kiểm tra nếu app đang ở trạng thái foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app còn tồn tại trong task stack (background)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking ABB app status via activity stack:", error.message);
    return false;
  }
}

async function isMSBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.com.msb.smartBanking.corp';

    // 1. Kiểm tra nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app đang background (vẫn còn trong task stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không còn chạy
    return false;

  } catch (error) {
    console.error("Error checking MSB app status via activity stack:", error.message);
    return false;
  }
}

async function isSTBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'com.sacombank.ewallet';

    // 1. Kiểm tra nếu app đang foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app còn trong task/activity (background)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking STB app status via activity stack:", error.message);
    return false;
  }
}

async function isTCBRunning({ device_id }) {
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const packageName = 'vn.com.techcombank.bb.app';

    // 1. Kiểm tra nếu app đang ở foreground
    const isForeground = output.includes('mResumedActivity') && output.includes(packageName);
    if (isForeground) return true;

    // 2. Kiểm tra nếu app đang background (còn tồn tại trong activity/task stack)
    const escapedPackage = packageName.replace(/\./g, '\\.');
    const isInTaskList =
      new RegExp(`ActivityRecord\\{.*${escapedPackage}`).test(output) ||
      new RegExp(`TaskRecord\\{.*${escapedPackage}`).test(output);
    if (isInTaskList) return true;

    // 3. Không chạy
    return false;

  } catch (error) {
    console.error("Error checking TCB app status via activity stack:", error.message);
    return false;
  }
}

const bankApps = [
  { name: "ABB", package: "vn.abbank.retail" },
  { name: "ACB", package: "mobile.acb.com.vn" },
  { name: "BAB", package: "com.bab.retailUAT" }, //com.vn.dongabank
  { name: "BIDV", package: "com.vnpay.bidv" },
  { name: "EIB", package: "com.vnpay.EximBankOmni" },
  { name: "HDB", package: "com.vnpay.hdbank" },
  { name: "ICB", package: "com.vietinbank.ipay" },
  { name: "MB", package: "com.mbmobile" },
  { name: "NAB", package: "ops.namabank.com.vn" },
  { name: "NCB", package: "com.ncb.bank" },
  { name: "OCB", package: "vn.com.ocb.awe" },
  { name: "PVCB", package: "com.pvcombank.retail" },
  { name: "SEAB", package: "vn.com.seabank.mb1" },
  { name: "SHB", package: "vn.shb.saha.mbanking" },
  { name: "SHBVN", package: "com.shinhan.global.vn.bank" },
  { name: "STB", package: "com.sacombank.ewallet" },
  { name: "TCB", package: "vn.com.techcombank.bb.app" },
  { name: "TPB", package: "com.tpb.mb.gprsandroid" },
  { name: "VCB", package: "com.VCB" },
  { name: "VIB", package: "com.vib.myvib2" },
  { name: "VIETBANK", package: "com.vnpay.vietbank" },
  { name: "VIKKI", package: "com.finx.vikki" },
  { name: "VPB", package: "com.vnpay.vpbankonline" }
];

async function getRunningBankApps({ device_id }) {
  const runningBanks = [];  

  try {
    const output = await client.shell(device_id, `dumpsys activity activities`)
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());    

    for (const app of bankApps) {
      const isForeground = output.includes('mResumedActivity') && output.includes(app.package);
      const isInTaskList =
        new RegExp(`ActivityRecord\\{.*${app.package.replace(/\./g, '\\.')}`).test(output) ||
        new RegExp(`TaskRecord\\{.*${app.package.replace(/\./g, '\\.')}`).test(output);

      if (isForeground || isInTaskList) {
        Logger.log(0, `\n ${app.name} đang chạy (${isForeground ? 'foreground' : 'background'}).`, __filename);
        runningBanks.push(app.name);
      }
    }

  } catch (err) {
    console.error(`Error checking current running bank apps:`, err.message);
  }  

  return runningBanks;
}

async function checkRunningBanks({ device_id }) {
  const runningBanks = await getRunningBankApps({ device_id });  

  // Hidden không dùng nữa tại vì xnk không biết dùng

  if (runningBanks.length > 1) {
    await closeAll({ device_id });
    Logger.log(1, 'VUI LÒNG THỰC HIỆN LẠI (CHỈ 1 BANK)', __filename);
    // Phát thông báo realtime
    notifier.emit('multiple-banks-detected', {
      device_id,
      message: 'VUI LÒNG THỰC HIỆN LẠI (1 BANK)'
    });

    return null;
  }

  return runningBanks[0] || null;
}

async function closeAll ({ device_id }) {       
  const deviceModel = await deviceHelper.getDeviceModel(device_id);   

  await client.shell(device_id, 'input keyevent KEYCODE_APP_SWITCH');
  await delay(1000);

  if (deviceModel === "ONEPLUS A5010") {
    // input swipe <x1> <y1> <x2> <y2> <duration>
    await client.shell(device_id, 'input swipe 540 1080 2182 1080 100'); 
    await delay(500);
    await client.shell(device_id, 'input tap 200 888');
    Logger.log(0, 'Đã đóng tất cả các app đang mở', __filename);      
  }
  else if (deviceModel === "ONEPLUS A5000") {
    // await client.shell(device_id, 'input swipe 540 1414 540 150 100'); // input swipe <x1> <y1> <x2> <y2> <duration>
    await client.shell(device_id, 'input swipe 540 1080 2182 1080 100'); 
    await delay(500);
    await client.shell(device_id, 'input tap 200 888');
    Logger.log(0, 'Đã đóng tất cả các app đang mở', __filename);  
  }
  else if (deviceModel === "SM-A155") {
    // await client.shell(device_id, 'input tap 540 1826');
    await client.shell(device_id, 'input tap 540 1868');
    Logger.log(0, 'Đã đóng tất cả các app đang mở', __filename);
  }
  else if (deviceModel === "SM-G781") {
    // await client.shell(device_id, 'input tap 540 1826');
    await client.shell(device_id, 'input tap 540 1886');
    Logger.log(0, 'Đã đóng tất cả các app đang mở', __filename);
  }
  else {
    await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
    Logger.log(0, 'Đã đóng tất cả các app đang mở', __filename);
  }        
        
  return { status: 200, message: 'Success' };
}

async function getDataJson  (filePath) {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);      
      return jsonData;
    }
    return null;
}

module.exports = { checkDeviceSemiAuto, checkRunningBanks, trackingLoop, isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning };