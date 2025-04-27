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

const { checkContentACB, checkContentEIB, checkContentOCB, checkContentNAB, checkContentTPB, checkContentVPB, checkContentMB } = require('../functions/checkBank.function');

async function clearTempFile( { device_id } ) {
  try {                
    await client.shell(device_id, `rm /sdcard/temp_dump.xml`);
    await delay(1000);    
  } catch (error) {
    console.error("Cannot delete file temp_dump.xml:", error.message);
  }
}

async function dumpXmlToLocal ( device_id, localPath ) {  
  try {          
    const tempPath = `/sdcard/temp_dump.xml`;
      
    await client.shell(device_id, `uiautomator dump ${tempPath}`);    
      
    await client.pull( device_id , tempPath)
      .then(stream => new Promise((resolve, reject) => {        
        const fileStream = fs.createWriteStream(localPath);
        stream.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
    }));    
  } catch (error) {
      console.error(`Error occurred while dumping XML to local. ${error.message}`);
  }
}

async function trackACB ( { device_id } ) {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi ACB...');

    // Click "CLOSE" to close UTILITIES SETTING
    // await client.shell(device_id, 'input tap 540 900');      
    await client.shell(device_id, 'input tap 787 1242');  

    let running = await isACBRunning( { device_id } );

    if (!running) {      
      console.log("ACB đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {      
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const localPath = path.join(targetDir, `${timestamp}.xml`);
    
        await dumpXmlToLocal( device_id, localPath );
        await checkContentACB( device_id, localPath );                
    
        running = await isACBRunning( { device_id } );
    
        if (!running) {            
          console.log('🚫 ACB đã tắt. Dừng theo dõi.');
          await clearTempFile( { device_id } );      
          return false;          
        }
    }
    return { status: 200, message: 'Success' };
}

async function trackEIB ( { device_id } ) {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi EIB...');

    let running = await isEIBRunning( { device_id } );

    if (!running) {
      console.log("EIB đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {      
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkContentEIB( device_id, localPath );         
                      
      running = await isEIBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 Eximbank EDigi đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
}

async function trackOCB ( { device_id } ) {
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi OCB...');

    let running = await isOCBRunning( { device_id } );

    if (!running) {
      console.log("OCB đang không chạy.");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {      
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkContentOCB( device_id, localPath );   
                      
      running = await isOCBRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 OCB OMNI đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
}

 async function trackNAB ( { device_id } ) {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    ensureDirectoryExists(targetDir);

    console.log('🔍 Bắt đầu theo dõi NAB...');

    let running = await isNABRunning( { device_id } );

    if (!running) {
      console.log("NAB đang không chạy");
      return;
    }
        
    await clearTempFile( { device_id } );
    
    while (running) {      
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);
    
      await dumpXmlToLocal( device_id, localPath );
      await checkContentNAB( device_id, localPath );                   
    
      running = await isNABRunning( { device_id } );
    
      if (!running) {            
        console.log('🚫 NAB đã tắt. Dừng theo dõi.');
        await clearTempFile( { device_id } );      
        return false;          
      }
    }
    return { status: 200, message: 'Success' };
}

async function trackTPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('🔍 Bắt đầu theo dõi TPB...');

  let running = await isTPBRunning( { device_id } );

  if (!running) {
    console.log("TPB đang không chạy");
    return;
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {      
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);
  
    await dumpXmlToLocal( device_id, localPath );
    await checkContentTPB( device_id, localPath );                   
  
    running = await isTPBRunning( { device_id } );
  
    if (!running) {            
      console.log('🚫 TPB đã tắt. Dừng theo dõi.');
      await clearTempFile( { device_id } );      
      return false;          
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackVPB ( { device_id } ) {    
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('🔍 Bắt đầu theo dõi VPB...');

  let running = await isVPBRunning( { device_id } );

  if (!running) {
    console.log("VPB đang không chạy");
    return;
  }
      
  await clearTempFile( { device_id } );
  
  while (running) {      
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);
  
    await dumpXmlToLocal( device_id, localPath );
    await checkContentVPB( device_id, localPath );                   
  
    running = await isVPBRunning( { device_id } );
  
    if (!running) {            
      console.log('🚫 VPB đã tắt. Dừng theo dõi.');
      await clearTempFile( { device_id } );      
      return false;          
    }
  }
  return { status: 200, message: 'Success' };
}

async function trackMB ( { device_id } ) {
  const targetDir = path.join('C:\\att_mobile_client\\logs\\');
  ensureDirectoryExists(targetDir);

  console.log('🔍 Bắt đầu theo dõi MB Bank...');

  let running = await isMBRunning( { device_id } );

  if (!running) {      
    console.log("MB đang không chạy.");
    return;
  }
        
  await clearTempFile( { device_id } );
    
  while (running) {      
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const localPath = path.join(targetDir, `${timestamp}.xml`);
    
    await dumpXmlToLocal( device_id, localPath );
    await checkContentMB( device_id, localPath );                
    
    running = await isMBRunning( { device_id } );
    
    if (!running) {            
      console.log('🚫 MB Bank đã tắt. Dừng theo dõi.');
      await clearTempFile( { device_id } );      
      return false;          
    }
  }
  return { status: 200, message: 'Success' };
}

const trackFunctions = {
    ACB: trackACB,
    EIB: trackEIB,
    OCB: trackOCB,
    NAB: trackNAB,
    TPB: trackTPB,
    VPB: trackVPB,
    MB: trackMB,
    // MSB: trackMSB
};

async function mainTracking({ device_id }) {
    const runningBanks = await getRunningBankApps({ device_id });    
    const bankName = runningBanks[0];
    const trackFunction = trackFunctions[bankName];    

    if (trackFunction) {
        console.log(`🚀 Bắt đầu theo dõi ${bankName}...`);
        await trackFunction({ device_id });
    } else {
        console.log(`❌ Không tìm thấy hàm track cho bank ${bankName}`);
    }
}

async function isACBRunning( { device_id } ) {             
    try {
        const output = await client.shell(device_id, 'pidof mobile.acb.com.vn')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MB Bank app status:", error.message);
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

async function isMSBRunning( { device_id } ) {                  
    try {
        const output = await client.shell(device_id, 'pidof vn.com.msb.smartBanking')
            .then(adb.util.readAll)
            .then(buffer => buffer.toString().trim());                
        if (output !== '') return true;        
    } catch (error) {
        console.error("Error checking MSB app status:", error.message);
        return false;
    }
}

const bankApps = [
    { name: "ACB", package: "mobile.acb.com.vn" },
    { name: "EIB", package: "com.vnpay.EximBankOmni" },
    { name: "OCB", package: "vn.com.ocb.awe" },
    { name: "NAB", package: "ops.namabank.com.vn" },
    { name: "TPB", package: "com.tpb.mb.gprsandroid" },
    { name: "VPB", package: "com.vnpay.vpbankonline" },
    { name: "MB",  package: "com.mbmobile" },
    { name: "MSB", package: "vn.com.msb.smartBanking" }    
];

async function getRunningBankApps({ device_id }) {
    const runningBanks = [];
  
    try {
      const output = await client.shell(device_id, `dumpsys activity activities | grep mResumedActivity`)
        .then(adb.util.readAll)
        .then(buffer => buffer.toString().trim());
  
      for (const app of bankApps) {
        if (output.includes(app.package)) {
          console.log(`✅ ${app.name} đang thực sự mở UI.`);
          runningBanks.push(app.name);
        } else {
          console.log(`❌ ${app.name} không mở UI.`);
        }
      }
  
    } catch (err) {
      console.error(`❌ Error checking current foreground app:`, err.message);
    }
      
    return runningBanks;
}

async function checkRunningBanks({ device_id }) {
    const runningBanks = await getRunningBankApps({
        device_id
    });    

    if (runningBanks.length > 1) {        
        await closeAll({ device_id });
        console.log("❗ VUI LÒNG THỰC HIỆN LẠI (CHỈ 1 BANK)");
        return null;
    }

    return runningBanks[0] || null;
}

async function closeAll ({ device_id }) {       
    const deviceModel = await deviceHelper.getDeviceModel(device_id); 

    await client.shell(device_id, 'input keyevent KEYCODE_APP_SWITCH');
    await delay(1000);

    if (deviceModel === "ONEPLUS A5010") {
      // await client.shell(device_id, 'input swipe 540 1414 540 150 100'); // input swipe <x1> <y1> <x2> <y2> <duration>
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
    else {
      await client.shell(device_id, 'input tap 540 1750'); // Click "Close all", for example: Note9
      console.log('Đã đóng tất cả các app đang mở');      
    }        
        
    return { status: 200, message: 'Success' };
}

module.exports = { checkRunningBanks, mainTracking, isACBRunning, isEIBRunning, isOCBRunning, isNABRunning, isTPBRunning, isVPBRunning, isMBRunning, isMSBRunning };