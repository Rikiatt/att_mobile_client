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

const infoPath = "C:/att_mobile_client/database/info-qr.json";
const infoQR = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
const qrStatus = infoQR?.data?.trans_status || '';
const qrDevice = infoQR?.data?.device_id || '';
const qrBank = infoQR?.data?.bank?.toLowerCase() || '';
const { sendTelegramAlert, saveAlertToDatabase } = require('../functions/alert.function');
let chatId = process.env.CHATID; // mặc định là gửi vào nhóm Warning - Semi Automated Transfer
const telegramToken = process.env.TELEGRAM_TOKEN;
const filePath = 'C:\\att_mobile_client\\database\\localdata.json';
const fileContent = fs.readFileSync(filePath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const siteOrg = jsonData?.org?.site || '';
const siteAtt = jsonData?.att?.site?.split('/').pop() || '';

const validSite = siteOrg || siteAtt; // Ưu tiên org nếu có, nếu không dùng att

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
const { checkContentABB, checkContentACB, checkContentEIB, checkContentNCB, checkContentOCB, checkContentNAB, checkContentSHBSAHA, checkContentTPB, checkContentVPB, checkContentMB, checkContentSEAB, checkContentSTB, 
stopABB, stopACB, stopBIDV, stopVCB, stopEIB, stopICB, stopLPBANK, stopMB, stopMSB, stopNAB, stopNCB, stopOCB, stopSEAB, stopSHBSAHA, stopPVCB, stopSTB, stopTPB, stopVPB
} 
= require('../functions/checkBank.function');

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
    } catch (_) {
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

    console.log("Screenshot saved to:", localPath);
  } catch (error) {
    console.error(`dumpOCRToLocal error: ${error.message}`);
  }
}

async function trackABB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('Đang theo dõi ABB...');

  let running = await isABBRunning( { device_id } );  

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "abb" !== qrBank ) ) {
      console.log(`Bank đang chạy là ABB nhưng QR yêu cầu bank khác (${qrBank}), stop ABB.`);
      await stopABB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
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
      await checkContentABB(device_id, localPath);
    }

    running = await isABBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isABBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('ABB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.abbank.retail') {
      console.log(`ABB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('ABB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackACB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi ACB...');

  // Click "CLOSE" to close UTILITIES SETTING
  // await client.shell(device_id, 'input tap 540 900');      
  await client.shell(device_id, 'input tap 787 1242');  

  let running = await isACBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( (device_id === qrDevice) && ( "acb" !== qrBank ) ) {
      console.log(`Bank đang chạy là ACB nhưng QR yêu cầu bank khác (${qrBank}), stop ACB.`);
      await stopACB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
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
        console.log('ACB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'mobile.acb.com.vn') {
      console.log(`ACB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('ACB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
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

async function trackEIB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi EIB...');

  let running = await isEIBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    if ( ( device_id === qrDevice ) && ( "eib" !== qrBank ) ) {
      console.log(`Bank đang chạy là EIB nhưng QR yêu cầu bank khác (${qrBank}), stop EIB.`);
      await stopEIB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      // return;
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
        console.log('EIB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.EximBankOmni') {
      console.log(`EIB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('EIB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackOCB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi OCB...');

  let running = await isOCBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "ocb" !== qrBank ) ) {
      console.log(`Bank đang chạy là OCB nhưng QR yêu cầu bank khác (${qrBank}), stop OCB.`);
      await stopOCB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
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
        console.log('OCB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.ocb.awe') {
      console.log(`OCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  
    if (!running) {
      console.log('OCB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackNCB ( { device_id } ) {                      
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);  

  console.log('Đang theo dõi NCB...');

  let running = await isNCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "ncb" !== qrBank ) ) {
      console.log(`Bank đang chạy là NCB nhưng QR yêu cầu bank khác (${qrBank}), stop NCB.`);
      await stopNCB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentNCB(device_id, localPath);
    }    

    running = await isNCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isNCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('NCB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.ncb.bank') {
      console.log(`NCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('NCB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

 async function trackNAB ( { device_id } ) {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('Đang theo dõi NAB...');

    let running = await isNABRunning( { device_id } );

    if (!running) {
      return await trackingLoop({ device_id });
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {
      // // Nếu không phải trạng thái đang xử lý thì bỏ qua
      // if (qrStatus !== 'in_process') {
      //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
      // } 
      // Nếu đúng trạng thái in_process thì so sánh device_id và bank
      if ( ( device_id === qrDevice ) && ( "nab" !== qrBank ) ) {
        console.log(`Bank đang chạy là NAB nhưng QR yêu cầu bank khác (${qrBank}), stop NAB.`);
        await stopNAB({ device_id });
        console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
        // await sendTelegramAlert(
        //   telegramToken,
        //   chatId,
        //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
        // );
        // await saveAlertToDatabase({
        //   timestamp: new Date().toISOString(),
        //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
        //   filePath: ".xml"
        // });
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
          console.log('NAB process đã tắt. Dừng theo dõi.');
          await clearTempFile({ device_id });
          return await trackingLoop({ device_id });
        }
        // Nếu vẫn chạy, tiếp tục bình thường
      } else if (currentApp !== 'ops.namabank.com.vn') {
        console.log(`NAB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
  
      if (!running) {
        console.log('NAB đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
    }
    return { status: 200, message: 'Success' };
}

async function trackSHBSAHA ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi SHB SAHA...');

  let running = await isSHBSAHARunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "shb" !== qrBank ) ) {
      console.log(`Bank đang chạy là SHB SAHA nhưng QR yêu cầu bank khác (${qrBank}), stop SHB SAHA.`);
      await stopSHBSAHA({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentSHBSAHA(device_id, localPath);
    }

    running = await isSHBSAHARunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isSHBSAHARunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('SHB SAHA process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.shb.saha.mbanking') {
      console.log(`SHB SAHA không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('SHB SAHA đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackTPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi TPB...');

  let running = await isTPBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "tpb" !== qrBank ) ) {
      console.log(`Bank đang chạy là TPB nhưng QR yêu cầu bank khác (${qrBank}), stop TPB.`);
      await stopTPB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentTPB(device_id, localPath);
    }

    running = await isTPBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isTPBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('TPB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.tpb.mb.gprsandroid') {
      console.log(`TPB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('TPB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackVPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi VPB...');

  let running = await isVPBRunning( { device_id } );

  if (!running) {
    return await trackingLoop({ device_id });
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "vpb" !== qrBank ) ) {
      console.log(`Bank đang chạy là VPB nhưng QR yêu cầu bank khác (${qrBank}), stop VPB.`);
      await stopVPB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentVPB(device_id, localPath);
    }

    running = await isVPBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVPBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('VPB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.vpbankonline') {
      console.log(`VPB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('VPB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackMB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('Đang theo dõi MB Bank...');

  let running = await isMBRunning({ device_id });

  if (!running) {
    return await trackingLoop({ device_id });
  }

  await clearTempFile({ device_id });

  while (running) {
    if ( ( device_id === qrDevice ) && ( "mb" !== qrBank ) ) {
      console.log(`Bank đang chạy là MB nhưng QR yêu cầu bank khác (${qrBank}), stop MB.`);
      await stopMB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
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
        console.log('MB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.mbmobile') {
      console.log(`MB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('MB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackBIDV({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('BIDV không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isBIDVRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "bidv" !== qrBank ) ) {
      console.log(`Bank đang chạy là BIDV nhưng QR yêu cầu bank khác (${qrBank}), stop BIDV.`);
      await stopBIDV({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentBIDV(device_id, localPath);
    }    

    running = await isBIDVRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });    
    if (currentApp === null) {      
      // Nếu isBIDVRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('BIDV process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vnpay.bidv') {
      console.log(`BIDV không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }    

    if (!running) {
      console.log('BIDV đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackVCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('VCB không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isVCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "vcb" !== qrBank ) ) {
      console.log(`Bank đang chạy là VCB nhưng QR yêu cầu bank khác (${qrBank}), stop VCB.`);
      await stopVCB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentVCB(device_id, localPath);
    }    

    running = await isVCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isVCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('VCB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.VCB') {
      console.log(`VCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('VCB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackSEAB({ device_id }) {      
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('SEAB không cho phép dump xml nên không hỗ trợ theo dõi...');

  let running = await isSEABRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "seab" !== qrBank ) ) {
      console.log(`Bank đang chạy là SEAB nhưng QR yêu cầu bank khác (${qrBank}), stop SEAB.`);
      await stopSEAB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
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
        console.log('SEAB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.seabank.mb1') {
      console.log(`SEAB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('SEAB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackICB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('ICB không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isICBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "icb" !== qrBank ) ) {
      console.log(`Bank đang chạy là ICB nhưng QR yêu cầu bank khác (${qrBank}), stop ICB.`);
      await stopICB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentICB(device_id, localPath);
    }

    running = await isICBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isICBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('ICB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.vietinbank.ipay') {
      console.log(`ICB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('ICB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackPVCB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('PVCB không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...');

  let running = await isPVCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "pvcb" !== qrBank ) ) {
      console.log(`Bank đang chạy là PVCB nhưng QR yêu cầu bank khác (${qrBank}), stop PVCB.`);
      await stopPVCB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
      // await saveAlertToDatabase({
      //   timestamp: new Date().toISOString(),
      //   reason: `Dùng sai app để chuyển tiền. (id: ${device_id})`,
      //   filePath: ".xml"
      // });
      return await trackingLoop({ device_id });
    } 
    else {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
      await dumpXmlToLocal(device_id, localPath);
      await checkContentPVCB(device_id, localPath);
    }

    running = await isPVCBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isPVCBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('PVCB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.pvcombank.retail') {
      console.log(`PVCB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('PVCB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackLPBANK({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('LPBANK không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...');

  let running = await isLPBANKRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) { 
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "lpbank" !== qrBank ) ) {
      console.log(`Bank đang chạy là LPBANK nhưng QR yêu cầu bank khác (${qrBank}), stop LPBANK.`);
      await stopLPBANK({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
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
      await checkContentLPBANK(device_id, localPath);
    }

    running = await isLPBANKRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isLPBANKRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('LPBANK process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.lpb.lienviet24h') {
      console.log(`LPBANK không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('LPBANK đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackMSB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('MSB không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isMSBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "msb" !== qrBank ) ) {
      console.log(`Bank đang chạy là msb nhưng QR yêu cầu bank khác (${qrBank}), stop MSB.`);
      await stopMSB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
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
      await checkContentMSB(device_id, localPath);
    }

    running = await isMSBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isMSBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('MSB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.msb.mobileBanking.corp') {
      console.log(`MSB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('MSB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackSTB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('Đang theo dõi Sacom...');

  let running = await isSTBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    // // Nếu không phải trạng thái đang xử lý thì bỏ qua
    // if (qrStatus !== 'in_process') {
    //   console.log("Không phải đơn đang xử lý (trans_status !== in_process), bỏ qua.");
    // } 
    // Nếu đúng trạng thái in_process thì so sánh device_id và bank
    if ( ( device_id === qrDevice ) && ( "stb" !== qrBank ) ) {
      console.log(`Bank đang chạy là sacombank nhưng QR yêu cầu bank khác (${qrBank}), stop sacombank.`);
      await stopSTB({ device_id });
      console.log(`Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`);
      // await sendTelegramAlert(
      //   telegramToken,
      //   chatId,
      //   `Cảnh báo! Dùng sai app để chuyển tiền. Vui lòng thực hiện lại (id: ${device_id})`
      // );
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
        console.log('STB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.sacombank.ewallet') {
      console.log(`STB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('STB đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

const trackFunctions = {
  ABB: trackABB,
  ACB: trackACB,
  EIB: trackEIB,
  OCB: trackOCB,
  // NCB: trackNCB,
  NAB: trackNAB,
  TPB: trackTPB,
  VPB: trackVPB,
  MB: trackMB,
  SHB: trackSHBSAHA,
  BIDV: trackBIDV,
  VCB: trackVCB,
  SEAB: trackSEAB,
  ICB: trackICB,
  PVC: trackPVCB,
  LPBANK: trackLPBANK,  
  MSB: trackMSB,
  STB: trackSTB
};

async function trackingLoop({ device_id }) {
  while (true) {    
    const bankName = await checkRunningBanks({ device_id });    

    if (bankName) {
      const trackFunction = trackFunctions[bankName];

      if (trackFunction) {
        console.log(`Đang theo dõi ${bankName}...`);
        await trackFunction({ device_id });
      } 
      break; // break loop nếu theo dõi được app hợp lệ
    } else {
      console.log('Đang chờ user mở đúng 1 app ngân hàng...');
      await delay(2000); // đợi 2s rồi check lại
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

async function isACBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('mobile.acb.com.vn');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking ACB app status via activity stack:", error.message);
    return false;
  }
}

async function isEIBRunning({ device_id }) {                 
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.vnpay.EximBankOmni');    

    return isInTopStack;
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

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.com.ocb.awe');    

    return isInTopStack;
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

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.ncb.bank');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking NCB app status via activity stack:", error.message);
    return false;
  }
}

async function isNABRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('ops.namabank.com.vn');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking NAB app status via activity stack:", error.message);
    return false;
  }
}

async function isTPBRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.tpb.mb.gprsandroid');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking TPB app status via activity stack:", error.message);
    return false;
  }
}

async function isVPBRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.vnpay.vpbankonline');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking VPB app status via activity stack:", error.message);
    return false;
  }
}

async function isMBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.mbmobile');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking MB app status via activity stack:", error.message);
    return false;
  }
}

async function isBIDVRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof com.vnpay.bidv')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking BIDV app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.vnpay.bidv');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking BIDV app status via activity stack:", error.message);
    return false;
  }
}

async function isVCBRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof com.VCB')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking VCB app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.VCB');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking VCB app status via activity stack:", error.message);
    return false;
  }
}

async function isSEABRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof vn.com.seabank.mb1')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking SEAB app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.com.seabank.mb1');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking SEAB app status via activity stack:", error.message);
    return false;
  }
}

async function isSHBSAHARunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.shb.saha.mbanking');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking SHB SAHA app status via activity stack:", error.message);
    return false;
  }
}

async function isICBRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof com.vietinbank.ipay')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking ICB app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.vietinbank.ipay');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking ICB app status via activity stack:", error.message);
    return false;
  }
}

async function isPVCBRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof com.pvcombank.retail')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking PVC app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.pvcombank.retail');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking PVC app status via activity stack:", error.message);
    return false;
  }
}

async function isLPBANKRunning( { device_id } ) {             
  // try {
  //   const output = await client.shell(device_id, 'pidof vn.com.lpb.lienviet24h')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking LPBANK app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.com.lpb.lienviet24h');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking LPBANK app status via activity stack:", error.message);
    return false;
  }
}

async function isABBRunning( { device_id } ) {         
  // try {
  //   const output = await client.shell(device_id, 'pidof vn.abbank.retail')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking ABB app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.abbank.retail');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking ABB app status via activity stack:", error.message);
    return false;
  }
}

async function isMSBRunning( { device_id } ) {                  
  // try {
  //   const output = await client.shell(device_id, 'pidof vn.com.msb.smartBanking.corp')
  //     .then(adb.util.readAll)
  //     .then(buffer => buffer.toString().trim());                
  //   if (output !== '') return true;        
  // } catch (error) {
  //   console.error("Error checking MSB app status:", error.message);
  //   return false;
  // }
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('vn.com.msb.smartBanking.corp');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking MSB app status via activity stack:", error.message);
    return false;
  }
}

async function isSTBRunning( { device_id } ) {                  
  try {
    const output = await client.shell(device_id, 'dumpsys activity activities')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());

    const isInTopStack = output.includes('TaskRecord') && output.includes('com.sacombank.ewallet');    

    return isInTopStack;
  } catch (error) {
    console.error("Error checking Sacom app status via activity stack:", error.message);
    return false;
  }
}

const bankApps = [
  { name: "ABB", package: "vn.abbank.retail" },  
  { name: "ACB", package: "mobile.acb.com.vn" },  
  { name: "EIB", package: "com.vnpay.EximBankOmni" },
  { name: "OCB", package: "vn.com.ocb.awe" },  
  { name: "NCB", package: "com.ncb.bank" },
  { name: "NAB", package: "ops.namabank.com.vn" },
  { name: "TPB", package: "com.tpb.mb.gprsandroid" },
  { name: "VPB", package: "com.vnpay.vpbankonline" },
  { name: "MB",  package: "com.mbmobile" },  
  { name: "SHB", package: "vn.shb.saha.mbanking" },  
  { name: "BIDV", package: "com.vnpay.bidv" },
  { name: "VCB", package: "com.VCB" },
  { name: "SEAB", package: "vn.com.seabank.mb1" },
  { name: "ICB", package: "com.vietinbank.ipay" },
  { name: "STB", package: "com.sacombank.ewallet" },
  { name: "TCB", package: "vn.com.techcombank.bb.app" }  
];

async function getRunningBankApps({ device_id }) {
  const runningBanks = [];  
  
  try {    
    const output = await client.shell(device_id, `dumpsys activity activities`)
      .then(adb.util.readAll)
      .then(buffer => buffer.toString());         
  
    for (const app of bankApps) {
      if (output.includes(app.package)) {
        console.log(`\n ${app.name} đang mở trong activity stack.`);
        runningBanks.push(app.name);
      } 
    }  
  } catch (err) {
    console.error(`Error checking current foreground app:`, err.message);
  }  
      
  return runningBanks;
}

async function checkRunningBanks({ device_id }) {
  const runningBanks = await getRunningBankApps({ device_id });      

  if (runningBanks.length > 1) {            
    await closeAll({ device_id });
    console.log("VUI LÒNG THỰC HIỆN LẠI (CHỈ 1 BANK)");
    return null;
  }

  return runningBanks[0] || null;
}

// async function checkRunningBanks({ device_id }) {
//   const runningBanks = await getRunningBankApps({ device_id });

//   if (runningBanks.length > 1) {
//     await closeAll({ device_id });

//     return { status: 400, valid: false, message: "VUI LÒNG THỰC HIỆN LẠI (CHỈ 1 BANK)" };
//   }

//   return runningBanks[0] || null;
// }

async function closeAll ({ device_id }) {       
  const deviceModel = await deviceHelper.getDeviceModel(device_id);   

  await client.shell(device_id, 'input keyevent KEYCODE_APP_SWITCH');
  await delay(1000);

  if (deviceModel === "ONEPLUS A5010") {
    // input swipe <x1> <y1> <x2> <y2> <duration>
    await client.shell(device_id, 'input swipe 540 1080 2182 1080 100'); 
    await delay(500);
    await client.shell(device_id, 'input tap 200 888');
    console.log('Đã đóng tất cả các app đang mở');      
  }
  else if (deviceModel === "ONEPLUS A5000") {
    // await client.shell(device_id, 'input swipe 540 1414 540 150 100'); // input swipe <x1> <y1> <x2> <y2> <duration>
    await client.shell(device_id, 'input swipe 540 1080 2182 1080 100'); 
    await delay(500);
    await client.shell(device_id, 'input tap 200 888');
    console.log('Đã đóng tất cả các app đang mở');      
  }
  else if (deviceModel === "SM-A155") {
    // await client.shell(device_id, 'input tap 540 1826');
    await client.shell(device_id, 'input tap 540 1868');
    console.log('Đã đóng tất cả các app đang mở');
  }
  else if (deviceModel === "SM-G781") {
    // await client.shell(device_id, 'input tap 540 1826');
    await client.shell(device_id, 'input tap 540 1886');
    console.log('Đã đóng tất cả các app đang mở');
  }
  else {
    await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
    console.log('Đã đóng tất cả các app đang mở');      
  }        
        
  return { status: 200, message: 'Success' };
}

module.exports = { checkDeviceSemiAuto, checkRunningBanks, trackingLoop, isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning };