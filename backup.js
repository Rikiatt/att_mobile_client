trackMBApp: async ( { device_id } ) => {    
    const targetDir = path.join('C:\\att_mobile_client\\logs\\');
    const telegramToken = '7884594856:AAEKZXIBH2IaROGR_k6Q49IP2kSt8uJ4wE0';
    const chatId = '7098096854';

    console.log('🔍 Đang theo dõi MB Bank App...');

    ensureDirectoryExists(targetDir);

    if (!chatId) {
      console.error("Cannot continue cause of invalid chat ID.");
      return;
    }

    let running = await isMbAppRunning(device_id);    

    if (!running) {
      console.log('🚫 App MB Bank đã tắt. Dừng theo dõi.');
      return;
    }

    console.log('App MB Bank is in process.');

    await clearTempFile(device_id);     

    while (running) {
      console.log('App MB Bank is in process');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const localPath = path.join(targetDir, `${timestamp}.xml`);

      await dumpXmlToLocal( device_id, localPath );
      
      if (checkXmlContent( localPath )) {    
        console.log('⚠️ Phát hiện nội dung nhạy cảm! Đóng app ngay!');
        await actionADB({ action: 'stopMB', device_id });

        await sendTelegramAlert(
            telegramToken,
            chatId,            
            `🚨 Cảnh báo: Phát hiện nội dung cần dừng trên thiết bị ${device_id}`
        );
        // await sendTelegramAlert();

        await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: 'Detected sensitive content',
            filePath: localPath
        });
        
        return;
      }

      running = await isMbAppRunning(device_id);

      if (!running) {            
          console.log("App MB Bank đã tắt. Thoát chương trình.");
          await clearTempFile(device_id);                
      }
    }
    await clearTempFile(device_id);  

    return { status: 200, message: 'Success' };
}