export const commandList = [
  {
    key: 'input',
    label: 'Nhập ký tự'
  },
  {
    key: 'enter',
    label: 'Enter'
  },
  {
    key: 'tap',
    label: 'Click tọa độ'
  },
  {
    key: 'delay',
    label: 'Delay (ms)'
  },
  {
    key: 'tab',
    label: 'Tab'
  },
  {
    key: 'newline',
    label: 'NewLine'
  }
];

export const commandParse = [
  {
    key: 'input',
    func: {
      action: 'input',
      text: 'Ky_tu_can_nhap'
    }
  },
  {
    key: 'enter',
    func: {
      action: 'enter'
    }
  },
  {
    key: 'tap',
    func: {
      action: 'tap',
      X: 'Toa_do_X',
      Y: 'Toa_do_Y'
    }
  },
  {
    key: 'delay',
    func: {
      action: 'delay',
      time: 'Nhap_mili_giay'
    }
  },
  {
    key: 'tab',
    func: {
      action: 'tab'
    }
  },
  {
    key: 'newline',
    func: {
      action: 'newline'
    }
  }
];