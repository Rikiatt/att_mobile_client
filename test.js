const iohook = require('iohook');
const fs = require('fs');

// Define the log file
const logFile = './mouse_positions.log';

// Clear existing log or create a new file
fs.writeFileSync(logFile, 'Mouse Position Log:\n', 'utf8');

// Event listener for mouse movement
iohook.on('mousemove', (event) => {
    const logEntry = `Mouse moved to X: ${event.x}, Y: ${event.y}\n`;
    fs.appendFileSync(logFile, logEntry, 'utf8');
    console.log(logEntry); // Optional: Display in the terminal
});

// Event listener for mouse clicks
iohook.on('mousedown', (event) => {
    const logEntry = `Mouse clicked at X: ${event.x}, Y: ${event.y}, Button: ${event.button}\n`;
    fs.appendFileSync(logFile, logEntry, 'utf8');
    console.log(logEntry); // Optional: Display in the terminal
});

// Start listening for events
iohook.start();
console.log('Tracking mouse movements and clicks. Press Ctrl+C to stop.');