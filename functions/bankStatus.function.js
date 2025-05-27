require('dotenv').config();

const adb = require('adbkit');
const path = require('path');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });

const deviceHelper = require('../helpers/deviceHelper');
const { delay } = require('../helpers/functionHelper');
const fs = require('fs');

const ensureDirectoryExists = ( dirPath ) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const coordinatessSemiAuto = require('../config/coordinatessSemiAuto.json');
const { checkContentABB, checkContentACB, checkContentEIB, checkContentOCB, checkContentNAB, checkContentSHBSAHA, checkContentTPB, checkContentVPB, checkContentMB, checkContentSTB } = require('../functions/checkBank.function');

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

async function trackABB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('Đang theo dõi ABB...');

  let running = await isABBRunning( { device_id } );
  console.log('log running in trackABB:',running);

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentABB(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentACB(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);    
    await checkContentEIB(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);
  
    await dumpXmlToLocal(device_id, localPath);
    await checkContentOCB(device_id, localPath);
  
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
  console.log('NCB không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isNCBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {
    // const timestamp = Math.floor(Date.now() / 1000).toString();
    // const localPath = path.join(targetDir, `${timestamp}.xml`);

    // await dumpXmlToLocal(device_id, localPath);
    // await checkContentNCB(device_id, localPath);    

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
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
  
      await dumpXmlToLocal(device_id, localPath);
      await checkContentNAB(device_id, localPath);
  
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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);    
    await checkContentSHBSAHA(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentTPB(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentVPB(device_id, localPath);

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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentMB(device_id, localPath);

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
    // const timestamp = Math.floor(Date.now() / 1000).toString();
    // const localPath = path.join(targetDir, `${timestamp}.xml`);

    // await dumpXmlToLocal(device_id, localPath);
    // await checkContentBIDV(device_id, localPath);    

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
    // const timestamp = Math.floor(Date.now() / 1000).toString();
    // const localPath = path.join(targetDir, `${timestamp}.xml`);

    // await dumpXmlToLocal(device_id, localPath);
    // await checkContentVCB(device_id, localPath);    

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

async function trackSEA({ device_id }) {      
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('SEA không cho phép dump màn hình nên không hỗ trợ theo dõi...');

  let running = await isSEARunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    running = await isSEARunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isSEARunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('SEA process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.seabank.mb1') {
      console.log(`SEA không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('SEA đã tắt. Dừng theo dõi.');
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

async function trackPVC({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('PVC không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...');

  let running = await isPVCRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    running = await isPVCRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isPVCRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('PVC process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'com.pvcombank.retail') {
      console.log(`PVC không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('PVC đã tắt. Dừng theo dõi.');
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }
  }

  return { status: 200, message: 'Success' };
}

async function trackLPB({ device_id }) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);
  console.log('LPB không có thiết bị để nghiên cứu nên không hỗ trợ theo dõi...');

  let running = await isLPBRunning( { device_id } );

  if (!running) {      
    return await trackingLoop({ device_id });
  }

  await clearTempFile( { device_id } );

  while (running) {   
    running = await isLPBRunning({ device_id });

    const currentApp = await getCurrentForegroundApp({ device_id });
    if (currentApp === null) {      
      // Nếu isLPBRunning vẫn true, tiếp tục theo dõi
      if (!running) {
        console.log('LPB process đã tắt. Dừng theo dõi.');
        await clearTempFile({ device_id });
        return await trackingLoop({ device_id });
      }
      // Nếu vẫn chạy, tiếp tục bình thường
    } else if (currentApp !== 'vn.com.lpb.lienviet24h') {
      console.log(`LPB không còn mở UI. Đang mở: ${currentApp}. Dừng theo dõi.`);
      await clearTempFile({ device_id });
      return await trackingLoop({ device_id });
    }

    if (!running) {
      console.log('LPB đã tắt. Dừng theo dõi.');
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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);

    await dumpXmlToLocal(device_id, localPath);
    await checkContentSTB(device_id, localPath);

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
  NCB: trackNCB,
  NAB: trackNAB,
  TPB: trackTPB,
  VPB: trackVPB,
  MB: trackMB,
  SHB: trackSHBSAHA,
  BIDV: trackBIDV,
  VCB: trackVCB,
  SEA: trackSEA,
  ICB: trackICB,
  PVC: trackPVC,
  LPB: trackLPB,  
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
      // else {
      //   console.log(`Không tìm thấy hàm track cho bank ${bankName}`);
      // }
      break; // break loop nếu theo dõi được app hợp lệ
    } else {
      console.log('Đang chờ user mở đúng 1 app ngân hàng...');
      await delay(3000); // đợi 3s rồi check lại
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
    const output = await client.shell(device_id, 'pidof mobile.acb.com.vn')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
      if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking ACB app status:", error.message);
    return false;
  }
}

async function isEIBRunning({ device_id }) {                 
  try {
    const output = await client.shell(device_id, 'pidof com.vnpay.EximBankOmni')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
      if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking EIB app status:", error.message);
    return false;
  }
}

async function isOCBRunning({ device_id }) {                 
  try {
    const output = await client.shell(device_id, 'pidof vn.com.ocb.awe')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
      if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking OCB app status:", error.message);
    return false;
  }
}

async function isNCBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.ncb.bank')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
      if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking NCB app status:", error.message);
    return false;
  }
}

async function isNABRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'pidof ops.namabank.com.vn')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());
      if (output !== '') return true;        
  } catch (error) {
    console.error("Got an error when checking NAB app status:", error.message);
    return false;
  }
}

async function isTPBRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'pidof com.tpb.mb.gprsandroid')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking TPB app status:", error.message);
    return false;
  }
}

async function isVPBRunning( { device_id } ) {      
  try {
    const output = await client.shell(device_id, 'pidof com.vnpay.vpbankonline')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking VPB app status:", error.message);
    return false;
  }
}

async function isMBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.mbmobile')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking MB Bank app status:", error.message);
    return false;
  }
}

async function isBIDVRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.vnpay.bidv')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking BIDV app status:", error.message);
    return false;
  }
}

async function isVCBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.VCB')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking VCB app status:", error.message);
    return false;
  }
}

async function isSEARunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof vn.com.seabank.mb1')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking SEA app status:", error.message);
    return false;
  }
}

async function isSHBSAHARunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof vn.shb.saha.mbanking')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking SHB SAHA status:", error.message);
    return false;
  }
}

async function isICBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.vietinbank.ipay')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking ICB app status:", error.message);
    return false;
  }
}

async function isPVCRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof com.pvcombank.retail')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking PVC app status:", error.message);
    return false;
  }
}

async function isLPBRunning( { device_id } ) {             
  try {
    const output = await client.shell(device_id, 'pidof vn.com.lpb.lienviet24h')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking LPB app status:", error.message);
    return false;
  }
}

async function isABBRunning( { device_id } ) {         
  try {
    const output = await client.shell(device_id, 'pidof vn.abbank.retail')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking ABB app status:", error.message);
    return false;
  }
}

async function isMSBRunning( { device_id } ) {                  
  try {
    const output = await client.shell(device_id, 'pidof vn.com.msb.smartBanking.corp')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking MSB app status:", error.message);
    return false;
  }
}

async function isSTBRunning( { device_id } ) {                  
  try {
    const output = await client.shell(device_id, 'pidof com.sacombank.ewallet')
      .then(adb.util.readAll)
      .then(buffer => buffer.toString().trim());                
    if (output !== '') return true;        
  } catch (error) {
    console.error("Error checking STB app status:", error.message);
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
  { name: "SEA", package: "vn.com.seabank.mb1" },
  { name: "ICB", package: "com.vietinbank.ipay" },
  { name: "STB", package: "com.sacombank.ewallet" },
];

async function getRunningBankApps({ device_id }) {
  const runningBanks = [];  
  
  try {
    // const output = await client.shell(device_id, `dumpsys activity activities | grep mResumedActivity`)
    const output = await client.shell(device_id, `dumpsys activity activities`)
      .then(adb.util.readAll)
      // .then(buffer => buffer.toString().trim());
      .then(buffer => buffer.toString());         
  
    for (const app of bankApps) {
      if (output.includes(app.package)) {
        console.log(`\n ${app.name} đang mở trong activity stack.`);
        runningBanks.push(app.name);
      } 
      // else {
      //   console.log(`${app.name} không có trong activity stack.`);
      // }
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
  // else {
  //   console.log('Đang theo dõi xem có đơn không, nếu có thì ');
  // }

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