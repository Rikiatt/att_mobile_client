const adbHelper = require('../helpers/adbHelper');
const deviceHelper = require('../helpers/deviceHelper');
const coordinatesScanQRBIDV = require('../config/coordinatesScanQRBIDV.json');
const coordinatesLoginICB = require('../config/coordinatesLoginICB.json');

module.exports = {
    checkDeviceFHD: async ({ device_id }) => {
        try {      
            const deviceModel = await deviceHelper.getDeviceModel(device_id);

            if (deviceModel === 'SM-N960') {
                console.log('Model is SM-N960, checking FHD+ mode...');
                const isFHD = await deviceHelper.checkDeviceFHD(device_id);

                if (!isFHD) {
                    console.log('Thiết bị chưa cài đặt ở chế độ FHD+');
                    return { status: 500, valid: false, message: 'Thiết bị chưa cài đặt ở chế độ FHD+' };
                }

                console.log('Thiết bị đang ở chế độ FHD+');
                return { status: 200, valid: true, message: 'Thiết bị đang ở chế độ FHD+' };
            } else {
                console.log(`Model ${deviceModel} không cần kiểm tra FHD+.`);
                return { status: 200, valid: true, message: 'Thiết bị không yêu cầu kiểm tra FHD+' };
            }
        } catch (error) {
            console.error(`Error checking device FHD+: ${error.message}`);
            throw error;
        }
    },

    checkFontScale: async ({ device_id }) => {
        try {      
            const deviceModel = await deviceHelper.getDeviceModel(device_id);

            // Kiểm tra nếu model là 'SM-N960' thì mới check
            if (deviceModel === 'SM-N960') {
                console.log('Model is SM-N960, checking font_scale...');
                const isMinFontScale = await deviceHelper.checkFontScale(device_id);

                if (!isMinFontScale) {
                console.log('Thiết bị chưa cài đặt cỡ font và kiểu font nhỏ nhất như yêu cầu');
                return { status: 500, valid: false, message: 'Thiết bị chưa cài đặt cỡ font và kiểu font nhỏ nhất như yêu cầu' };
                }

                console.log('Thiết bị đang cài đặt cỡ font và kiểu font nhỏ nhất như yêu cầu');
                return { status: 200, valid: true, message: 'Thiết bị đang cài đặt cỡ font và kiểu font nhỏ nhất như yêu cầu' };
            } else {
                console.log(`Model ${deviceModel} không cần kiểm tra font_scale.`);
                return { status: 200, valid: true, message: 'Thiết bị không yêu cầu kiểm tra font_scale' };
            }
        } catch (error) {
            console.error(`Error checking font_scale: ${error.message}`);
            throw error;
        }
    },

    checkWMDensity: async ({ device_id }) => {
        try {      
            const deviceModel = await deviceHelper.getDeviceModel(device_id);

            // Kiểm tra nếu model là 'SM-N960' thì mới check
            if (deviceModel === 'SM-N960') {
                console.log('Model is SM-N960, checking font_scale...');
                const isMinWMDensity = await deviceHelper.checkWMDensity(device_id);

                if (!isMinWMDensity) {
                console.log('Thiết bị chưa cài đặt cỡ Thu/Phóng màn hình nhỏ nhất như yêu cầu');
                return { status: 500, valid: false, message: 'Thiết bị chưa cài đặt cỡ Thu/Phóng màn hình nhỏ nhất như yêu cầu' };
                }

                console.log('Thiết bị đang cài đặt cỡ Thu/Phóng màn hình nhỏ nhất như yêu cầu');
                return { status: 200, valid: true, message: 'Thiết bị đang cài đặt cỡ Thu/Phóng màn hình nhỏ nhất như yêu cầu' };
            } else {
                console.log(`Model ${deviceModel} không cần kiểm tra Thu/Phóng màn hình.`);
                return { status: 200, valid: true, message: 'Thiết bị không yêu cầu kiểm tra Thu/Phóng màn hình' };
            }
        } catch (error) {
            console.error(`Error checking wm density: ${error.message}`);
            throw error;
        }
    },
    
    checkDeviceICB: async ({ device_id }) => {
        try {
        const deviceModel = await deviceHelper.getDeviceModel(device_id);      
    
        const deviceCoordinates = coordinatesLoginICB[deviceModel];             
        
        if (deviceCoordinates == undefined) {                
            return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
        }
    
        return deviceCoordinates;
        } catch (error) {
            console.error(`Error checking device: ${error.message}`);
            throw error;
        }
    },

    checkDeviceBIDV: async ({ device_id }) => {
        try {
          const deviceModel = await deviceHelper.getDeviceModel(device_id);      
      
          const deviceCoordinates = coordinatesScanQRBIDV[deviceModel];             
          
          if (deviceCoordinates == undefined) {                
            return { status: 500, valid: false, message: 'Thiết bị chưa hỗ trợ' };    
          }
      
          return deviceCoordinates;
        } catch (error) {
          console.error(`Error checking device: ${error.message}`);
          throw error;
        }
    }
}
